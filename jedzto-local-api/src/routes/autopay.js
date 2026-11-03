/**
 * routes/autopay.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Autopay sandbox / production checkout.
 *
 *   GET  /autopay/pay?id=ORDER_ID     — HTML form → Autopay paywall
 *   GET  /autopay/return              — customer return (signed ServiceID+OrderID)
 *   GET  /autopay/cancel?order_id&sig — cancel unpaid order
 *   POST /autopay/itn                 — Instant Transaction Notification
 *   GET  /autopay/confirm?order_id    — JSON poll for the app
 */

import crypto from 'crypto'
import express from 'express'
import {
  AUTOPAY_ENABLED,
  AUTOPAY_SERVICE_ID,
  PUBLIC_API_URL,
  PORT,
  JWT_SECRET
} from '../config.js'
import { Order } from '../models/index.js'
import {
  markStripeOrderPaid,
  cancelUnpaidOnlineOrder
} from '../services/orderNotify.js'
import {
  buildStartTransactionFields,
  buildAutopayRedirectHtml,
  verifyReturnHash,
  parseItnPayload,
  buildItnResponseXml,
  formatAutopayAmount
} from '../services/autopay.js'
import { escapeHtml } from '../utils/sanitize.js'

const router = express.Router()
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000

const baseUrlFromReq = (req) => {
  if (PUBLIC_API_URL) return PUBLIC_API_URL
  const host = req.get('host') || `localhost:${PORT}`
  const proto = req.protocol || 'http'
  return `${proto}://${host}`
}

const signOrderRef = (orderId) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`autopay-ref:${orderId}`).digest('hex')

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

const htmlPage = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#121212;color:#fff;
  display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  h1{font-size:22px;margin:0 0 8px}p{color:#9CA3AF;margin:0}
</style></head><body><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></div></body></html>`

const getSerializeOrder = async () => {
  const mod = await import('../graphql/resolvers/index.js')
  return mod.serializeOrder
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

/** Autopay OrderID must stay unique forever — append a short suffix for retries. */
const autopayOrderIdFor = (order) => {
  const base = String(order.orderId || order._id).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 24)
  const stamp = Date.now().toString(36).slice(-6)
  return `${base}${stamp}`.slice(0, 32)
}

router.get('/pay', async (req, res) => {
  try {
    if (!AUTOPAY_ENABLED) {
      return res
        .status(503)
        .send(htmlPage('Autopay niedostępny', 'Brak konfiguracji AUTOPAY_SERVICE_ID / AUTOPAY_SHARED_KEY.'))
    }

    const orderId = String(req.query.id || '').trim()
    const order = await findOrder(orderId)
    if (!order) {
      return res.status(404).send(htmlPage('Nie znaleziono', 'Zamówienie nie istnieje.'))
    }

    const method = String(order.paymentMethod || '').toUpperCase()
    if (method !== 'AUTOPAY' && method !== 'STRIPE') {
      return res
        .status(400)
        .send(htmlPage('Błąd płatności', 'To zamówienie nie jest płatnością online Autopay.'))
    }

    const createdAt = new Date(order.createdAt || Date.now()).getTime()
    if (Date.now() - createdAt > CHECKOUT_WINDOW_MS) {
      return res
        .status(410)
        .send(htmlPage('Link wygasł', 'Rozpocznij płatność ponownie w aplikacji.'))
    }

    if (isPaid(order)) {
      const base = baseUrlFromReq(req)
      return res.redirect(
        `${base}/autopay/return?ServiceID=${encodeURIComponent(AUTOPAY_SERVICE_ID)}&OrderID=${encodeURIComponent(order.orderId)}&already_paid=1`
      )
    }

    // Persist the Autopay OrderID we send so ITN/return can resolve the order.
    const apOrderId = autopayOrderIdFor(order)
    order.stripePaymentIntentId = `autopay:${apOrderId}`
    await order.save()

    const email =
      order.user?.email ||
      order.userEmail ||
      (typeof order.user === 'object' ? order.user?.email : '') ||
      ''

    const fields = buildStartTransactionFields({
      orderId: apOrderId,
      amount: order.orderAmount,
      description: `JedzTo ${order.orderId}`.slice(0, 79),
      currency: 'PLN',
      customerEmail: email
    })

    return res
      .status(200)
      .type('html')
      .send(buildAutopayRedirectHtml(fields))
  } catch (error) {
    console.error('[autopay] pay', error)
    return res
      .status(500)
      .send(htmlPage('Błąd płatności', 'Nie udało się uruchomić płatności Autopay.'))
  }
})

router.get('/return', async (req, res) => {
  try {
    const serviceID = String(req.query.ServiceID || req.query.serviceID || '').trim()
    const orderID = String(req.query.OrderID || req.query.orderID || '').trim()
    const hash = String(req.query.Hash || req.query.hash || '').trim()
    const alreadyPaid = String(req.query.already_paid || '') === '1'

    if (!alreadyPaid) {
      if (!verifyReturnHash({ serviceID, orderID, hash })) {
        console.warn('[autopay] return hash mismatch', { serviceID, orderID })
        return res
          .status(400)
          .send(htmlPage('Błąd weryfikacji', 'Nie udało się potwierdzić powrotu z Autopay.'))
      }
    }

    // ITN is authoritative; return page only shows a friendly message.
    // App polls /autopay/confirm.
    return res.send(
      htmlPage(
        'Płatność przyjęta',
        'Dziękujemy. Potwierdzamy zamówienie — możesz wrócić do aplikacji.'
      )
    )
  } catch (error) {
    console.error('[autopay] return', error)
    return res
      .status(500)
      .send(htmlPage('Błąd płatności', 'Nie udało się przetworzyć powrotu z Autopay.'))
  }
})

router.get('/cancel', async (req, res) => {
  try {
    const orderId = String(req.query.order_id || '').trim()
    if (orderId && orderRefMatches(orderId, req.query.sig)) {
      const serializeOrder = await getSerializeOrder()
      await cancelUnpaidOnlineOrder(orderId, serializeOrder)
    }
  } catch (error) {
    console.error('[autopay] cancel', error)
  }
  return res.send(
    htmlPage('Płatność anulowana', 'Anulowano płatność. Możesz wrócić do aplikacji i spróbować ponownie.')
  )
})

router.get('/confirm', async (req, res) => {
  try {
    const orderId = String(req.query.order_id || '').trim()
    if (!orderId) return res.status(400).json({ paid: false, error: 'missing_ids' })

    let order = await findOrder(orderId)
    if (!order) {
      // Also match by Autopay OrderID stored on stripePaymentIntentId.
      order = await Order.findOne({
        stripePaymentIntentId: new RegExp(`^autopay:.*${orderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
      })
    }
    if (!order && orderId) {
      order = await Order.findOne({
        stripePaymentIntentId: `autopay:${orderId}`
      })
    }

    return res.json({ paid: isPaid(order), order: orderPayload(order) })
  } catch (error) {
    console.error('[autopay] confirm', error)
    return res.status(500).json({ paid: false, error: 'confirm_failed' })
  }
})

/**
 * Autopay ITN — form field `transactions` = Base64(XML).
 * Must reply with confirmation XML in the same response.
 */
router.post('/itn', async (req, res) => {
  try {
    if (!AUTOPAY_ENABLED) {
      return res.status(503).type('text/plain').send('autopay_not_configured')
    }

    const raw = req.body?.transactions || req.body?.Transactions || ''
    const itn = parseItnPayload(raw)

    if (!itn.orderID) {
      console.warn('[autopay] ITN missing orderID')
      return res.status(400).type('application/xml').send(
        buildItnResponseXml({
          serviceID: AUTOPAY_SERVICE_ID,
          orderID: 'unknown',
          confirmed: false
        })
      )
    }

    let order =
      (await Order.findOne({ stripePaymentIntentId: `autopay:${itn.orderID}` })) ||
      (await findOrder(itn.orderID))

    // Fallback: OrderID may be base+suffix — match prefix of our orderId.
    if (!order && itn.orderID.length >= 8) {
      const prefix = itn.orderID.slice(0, -6)
      order = await Order.findOne({
        orderId: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
      }).sort({ createdAt: -1 })
    }

    let confirmed = false
    if (
      itn.hashOk &&
      String(itn.serviceID) === String(AUTOPAY_SERVICE_ID) &&
      order &&
      itn.paymentStatus === 'SUCCESS'
    ) {
      const expected = formatAutopayAmount(order.orderAmount)
      const received = formatAutopayAmount(itn.amount)
      if (received === expected || Number(itn.amount) + 0.01 >= Number(order.orderAmount)) {
        const serializeOrder = await getSerializeOrder()
        await markStripeOrderPaid(
          order,
          serializeOrder,
          itn.remoteID ? `autopay:${itn.remoteID}` : order.stripePaymentIntentId,
          Number(itn.amount)
        )
        confirmed = true
        console.log(`[autopay] ITN SUCCESS order=${order.orderId} remote=${itn.remoteID}`)
      } else {
        console.warn(
          `[autopay] ITN amount mismatch order=${order.orderId} expected=${expected} got=${received}`
        )
      }
    } else if (itn.paymentStatus === 'FAILURE' && order) {
      console.log(`[autopay] ITN FAILURE order=${order.orderId}`)
      // Do not auto-cancel on FAILURE — customer may retry same session.
      confirmed = itn.hashOk
    } else if (itn.paymentStatus === 'PENDING') {
      confirmed = itn.hashOk
    } else {
      confirmed = false
      console.warn('[autopay] ITN rejected', {
        hashOk: itn.hashOk,
        status: itn.paymentStatus,
        orderID: itn.orderID
      })
    }

    const xml = buildItnResponseXml({
      serviceID: itn.serviceID || AUTOPAY_SERVICE_ID,
      orderID: itn.orderID,
      confirmed
    })
    return res.status(200).type('application/xml').send(xml)
  } catch (error) {
    console.error('[autopay] ITN error', error)
    return res.status(500).type('text/plain').send('itn_error')
  }
})

/** Helper for the app: cancel link with HMAC (optional UI). */
router.get('/cancel-link', (req, res) => {
  const orderId = String(req.query.order_id || '').trim()
  if (!orderId) return res.status(400).json({ error: 'missing_order_id' })
  const base = baseUrlFromReq(req)
  const sig = signOrderRef(orderId)
  return res.json({
    url: `${base}/autopay/cancel?order_id=${encodeURIComponent(orderId)}&sig=${sig}`
  })
})

export const autopayRouter = router
