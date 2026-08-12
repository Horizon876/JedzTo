/**
 * routes/stripe.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe Checkout integration.
 *
 * SECURITY MODEL
 * A payment is only ever recorded as PAID from a source Stripe itself
 * authenticates:
 *   1. POST /stripe/webhook  — signature-verified event (authoritative),
 *   2. GET  /stripe/confirm  — a Checkout Session id that we re-read from the
 *                              Stripe API and match against the order.
 * The previous implementation marked an order paid from a bare `order_id`
 * query parameter, so anyone could get free orders with a single GET request.
 */

import crypto from 'crypto'
import express from 'express'
import Stripe from 'stripe'
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  PUBLIC_API_URL,
  PORT,
  JWT_SECRET,
  NODE_ENV
} from '../config.js'
import { Order } from '../models/index.js'
import {
  markStripeOrderPaid,
  cancelUnpaidOnlineOrder
} from '../services/orderNotify.js'
import { escapeHtml } from '../utils/sanitize.js'

const router = express.Router()

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

/** Checkout links are short-lived; an older order must be re-initiated. */
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000

const baseUrlFromReq = (req) => {
  if (PUBLIC_API_URL) return PUBLIC_API_URL
  const host = req.get('host') || `localhost:${PORT}`
  const proto = req.protocol || 'http'
  return `${proto}://${host}`
}

/**
 * HMAC that binds a redirect back to the order it was issued for. Without it,
 * /stripe/cancel would let anyone cancel any stranger's pending order.
 */
const signOrderRef = (orderId) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`stripe-ref:${orderId}`).digest('hex')

const orderRefMatches = (orderId, signature) => {
  const expected = Buffer.from(signOrderRef(orderId))
  const actual = Buffer.from(String(signature || ''))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

const findOrder = async (identifier) => {
  if (!identifier) return null
  const byOrderId = await Order.findOne({ orderId: identifier })
  if (byOrderId) return byOrderId
  return Order.findById(identifier).catch(() => null)
}

const amountInMinorUnits = (order) => {
  const major = Number(order.orderAmount || 0)
  return Math.max(0, Math.round(major * 100))
}

// Both title and body are escaped: `error.message` used to be interpolated
// straight into the markup (reflected XSS + internal detail disclosure).
const htmlPage = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#121212;color:#fff;
  display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  h1{font-size:22px;margin:0 0 8px}p{color:#9CA3AF;margin:0}
</style></head><body><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></div></body></html>`

/** Internal errors are logged, never echoed back to the client. */
const failurePage = (res, status, context, error) => {
  console.error(`[stripe] ${context}`, error)
  return res
    .status(status)
    .send(htmlPage('Błąd płatności', 'Nie udało się przetworzyć płatności. Spróbuj ponownie.'))
}

const getSerializeOrder = async () => {
  const mod = await import('../graphql/resolvers/index.js')
  return mod.serializeOrder
}

const sessionLooksPaid = (session) => {
  if (!session) return false
  const status = String(session.payment_status || '').toLowerCase()
  return (
    status === 'paid' ||
    status === 'no_payment_required' ||
    String(session.status || '').toLowerCase() === 'complete'
  )
}

const isPaid = (order) =>
  Boolean(
    order &&
      (String(order.paymentStatus || '').toUpperCase() === 'PAID' ||
        Number(order.paidAmount || 0) > 0)
  )

const orderPayload = (order) =>
  order
    ? {
        _id: String(order._id),
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        paidAmount: order.paidAmount,
        orderAmount: order.orderAmount
      }
    : null

/**
 * Settles an order from a Checkout Session, re-reading the session from Stripe
 * so the client cannot influence the outcome. The session must reference this
 * order and must cover its full amount.
 */
async function settleFromSession(sessionId) {
  if (!stripe || !sessionId) return null

  let session = await stripe.checkout.sessions.retrieve(sessionId)
  // Card Checkout is usually paid immediately; one short retry covers the race.
  if (!sessionLooksPaid(session)) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    session = await stripe.checkout.sessions.retrieve(sessionId)
  }
  if (!sessionLooksPaid(session)) return null

  const reference = session.metadata?.mongoId || session.metadata?.orderId
  const order = await findOrder(reference)
  if (!order) {
    console.warn('[stripe] session without a matching order', sessionId)
    return null
  }

  const expected = amountInMinorUnits(order)
  const received = Number(session.amount_total || 0)
  if (received < expected) {
    // Underpaid (e.g. a session created for a since-modified order).
    console.warn(
      `[stripe] amount mismatch for ${order.orderId}: expected ${expected}, got ${received}`
    )
    return null
  }

  const serializeOrder = await getSerializeOrder()
  return markStripeOrderPaid(order, serializeOrder, session.payment_intent, received / 100)
}

router.get('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res
        .status(503)
        .send(htmlPage('Stripe niedostępny', 'Brak konfiguracji płatności w API.'))
    }

    const orderId = String(req.query.id || '').trim()
    const order = await findOrder(orderId)
    if (!order) {
      return res.status(404).send(htmlPage('Nie znaleziono', 'Zamówienie nie istnieje.'))
    }

    if (String(order.paymentMethod || '').toUpperCase() !== 'STRIPE') {
      return res
        .status(400)
        .send(htmlPage('Błąd płatności', 'To zamówienie nie jest płatnością Stripe.'))
    }

    // Narrow window for an unauthenticated endpoint: a checkout link can only
    // be opened for a freshly created order, which limits id-guessing abuse.
    const createdAt = new Date(order.createdAt || Date.now()).getTime()
    if (Date.now() - createdAt > CHECKOUT_WINDOW_MS) {
      return res
        .status(410)
        .send(htmlPage('Link wygasł', 'Rozpocznij płatność ponownie w aplikacji.'))
    }

    const base = baseUrlFromReq(req)
    const ref = encodeURIComponent(order.orderId)
    const signature = signOrderRef(order.orderId)

    if (isPaid(order)) {
      return res.redirect(`${base}/stripe/success?order_id=${ref}&already_paid=1`)
    }

    const amount = amountInMinorUnits(order)
    if (amount < 1) {
      return res.status(400).send(htmlPage('Błąd kwoty', 'Kwota zamówienia jest nieprawidłowa.'))
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'pln',
            unit_amount: amount,
            product_data: {
              name: `Zamówienie JedzTo ${order.orderId}`,
              description: 'Płatność za zamówienie'
            }
          }
        }
      ],
      metadata: {
        orderId: order.orderId,
        mongoId: String(order._id)
      },
      success_url: `${base}/stripe/success?session_id={CHECKOUT_SESSION_ID}&order_id=${ref}`,
      cancel_url: `${base}/stripe/cancel?order_id=${ref}&sig=${signature}`
    })

    if (!session.url) {
      return failurePage(res, 500, 'create-checkout-session', 'missing session url')
    }

    return res.redirect(303, session.url)
  } catch (error) {
    return failurePage(res, 500, 'create-checkout-session', error)
  }
})

/**
 * JSON status endpoint polled by the mobile app after Checkout.
 * With a session_id it settles the payment; without one it only reports the
 * currently stored state — it can never grant a paid status by itself.
 */
router.get('/confirm', async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || '').trim()
    const orderId = String(req.query.order_id || '').trim()
    if (!sessionId && !orderId) {
      return res.status(400).json({ paid: false, error: 'missing_ids' })
    }

    const settled = sessionId ? await settleFromSession(sessionId) : null
    const order = settled || (await findOrder(orderId))

    return res.json({ paid: isPaid(order), order: orderPayload(order) })
  } catch (error) {
    console.error('[stripe] confirm', error)
    return res.status(500).json({ paid: false, error: 'confirm_failed' })
  }
})

router.get('/success', async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || '').trim()
    if (sessionId) await settleFromSession(sessionId)
    return res.send(
      htmlPage(
        'Płatność przyjęta',
        'Dziękujemy. Potwierdzamy zamówienie — możesz wrócić do aplikacji.'
      )
    )
  } catch (error) {
    return failurePage(res, 500, 'success', error)
  }
})

router.get('/cancel', async (req, res) => {
  try {
    const orderId = String(req.query.order_id || '').trim()
    // Only a redirect we signed ourselves may cancel an order.
    if (orderId && orderRefMatches(orderId, req.query.sig)) {
      const serializeOrder = await getSerializeOrder()
      await cancelUnpaidOnlineOrder(orderId, serializeOrder)
    }
  } catch (error) {
    console.error('[stripe] cancel', error)
  }
  return res.send(
    htmlPage('Płatność anulowana', 'Anulowano płatność. Możesz wrócić do aplikacji i spróbować ponownie.')
  )
})

/**
 * Authoritative payment notifications from Stripe.
 * Mounted with a raw body parser in server.js — constructEvent needs the exact
 * bytes Stripe signed.
 */
router.post('/webhook', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ received: false, error: 'webhook_not_configured' })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.get('stripe-signature'),
      STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    // An invalid signature means the request did not come from Stripe.
    console.warn('[stripe] webhook signature verification failed:', error.message)
    return res.status(400).json({ received: false })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        await settleFromSession(event.data.object.id)
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const reference =
          event.data.object.metadata?.mongoId || event.data.object.metadata?.orderId
        if (reference) {
          const serializeOrder = await getSerializeOrder()
          await cancelUnpaidOnlineOrder(reference, serializeOrder)
        }
        break
      }
      default:
        if (NODE_ENV !== 'production') {
          console.log(`[stripe] unhandled webhook event ${event.type}`)
        }
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want on a DB hiccup.
    console.error('[stripe] webhook handling failed', error)
    return res.status(500).json({ received: false })
  }

  return res.json({ received: true })
})

export const stripeRouter = router
