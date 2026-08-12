import express from 'express'
import Stripe from 'stripe'
import {
  STRIPE_SECRET_KEY,
  PUBLIC_API_URL,
  PORT
} from '../config.js'
import { Order } from '../models/index.js'
import {
  markStripeOrderPaid,
  cancelUnpaidOnlineOrder
} from '../services/orderNotify.js'

const router = express.Router()

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null

const baseUrlFromReq = (req) => {
  if (PUBLIC_API_URL) return PUBLIC_API_URL
  const host = req.get('host') || `localhost:${PORT}`
  const proto = req.protocol || 'http'
  return `${proto}://${host}`
}

const findOrder = async (id) => {
  if (!id) return null
  return (
    (await Order.findOne({ orderId: id })) ||
    (await Order.findById(id).catch(() => null))
  )
}

const amountInMinorUnits = (order) => {
  const major = Number(order.orderAmount || 0)
  return Math.max(0, Math.round(major * 100))
}

const htmlPage = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#121212;color:#fff;
  display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  h1{font-size:22px;margin:0 0 8px}p{color:#9CA3AF;margin:0}
</style></head><body><div><h1>${title}</h1><p>${body}</p></div></body></html>`

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
 * Marks the order paid from a Checkout Session (or order_id fallback).
 * Used by both the browser success redirect and the app confirm poll.
 */
async function confirmPaidFromRequest({ sessionId, orderId }) {
  const serializeOrder = await getSerializeOrder()
  let order = orderId ? await findOrder(orderId) : null

  if (stripe && sessionId) {
    let session = await stripe.checkout.sessions.retrieve(sessionId)
    // Card Checkout is usually paid immediately; one short retry covers race.
    if (!sessionLooksPaid(session)) {
      await new Promise((r) => setTimeout(r, 800))
      session = await stripe.checkout.sessions.retrieve(sessionId)
    }
    const metaOrderId = session.metadata?.orderId || orderId
    if (sessionLooksPaid(session) && metaOrderId) {
      order = (await findOrder(metaOrderId)) || order
      if (order) order = await markStripeOrderPaid(order, serializeOrder, session.payment_intent)
    }
  } else if (order) {
    // already_paid / manual confirm path
    order = await markStripeOrderPaid(order, serializeOrder)
  }

  const paid =
    order &&
    (String(order.paymentStatus || '').toUpperCase() === 'PAID' ||
      Number(order.paidAmount || 0) > 0)

  return { paid: Boolean(paid), order: orderPayload(order) }
}

router.get('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res
        .status(503)
        .send(htmlPage('Stripe niedostępny', 'Brak STRIPE_SECRET_KEY w konfiguracji API.'))
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

    if (
      String(order.paymentStatus || '').toUpperCase() === 'PAID' ||
      Number(order.paidAmount || 0) > 0
    ) {
      const base = baseUrlFromReq(req)
      return res.redirect(
        `${base}/stripe/success?order_id=${encodeURIComponent(order.orderId)}&already_paid=1`
      )
    }

    const base = baseUrlFromReq(req)
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
      success_url: `${base}/stripe/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(order.orderId)}`,
      cancel_url: `${base}/stripe/cancel?order_id=${encodeURIComponent(order.orderId)}`
    })

    if (!session.url) {
      return res.status(500).send(htmlPage('Błąd Stripe', 'Brak URL sesji Checkout.'))
    }

    return res.redirect(303, session.url)
  } catch (error) {
    console.error('[stripe] create-checkout-session', error)
    return res
      .status(500)
      .send(htmlPage('Błąd Stripe', error?.message || 'Nie udało się utworzyć płatności.'))
  }
})

/** JSON confirm for the mobile app — fast path after Checkout success. */
router.get('/confirm', async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || '').trim()
    const orderId = String(req.query.order_id || '').trim()
    if (!sessionId && !orderId) {
      return res.status(400).json({ paid: false, error: 'missing_ids' })
    }
    const result = await confirmPaidFromRequest({ sessionId, orderId })
    return res.json(result)
  } catch (error) {
    console.error('[stripe] confirm', error)
    return res.status(500).json({ paid: false, error: error?.message || 'confirm_failed' })
  }
})

router.get('/success', async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || '').trim()
    const orderId = String(req.query.order_id || '').trim()
    await confirmPaidFromRequest({
      sessionId,
      orderId: orderId || undefined
    })
    // already_paid without session: still try mark
    if (!sessionId && orderId && req.query.already_paid) {
      await confirmPaidFromRequest({ orderId })
    }

    return res.send(
      htmlPage(
        'Płatność przyjęta',
        'Dziękujemy. Potwierdzamy zamówienie — możesz wrócić do aplikacji.'
      )
    )
  } catch (error) {
    console.error('[stripe] success', error)
    return res
      .status(500)
      .send(htmlPage('Błąd', error?.message || 'Nie udało się potwierdzić płatności.'))
  }
})

router.get('/cancel', async (req, res) => {
  try {
    const orderId = String(req.query.order_id || '').trim()
    if (orderId) {
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

export const stripeRouter = router
