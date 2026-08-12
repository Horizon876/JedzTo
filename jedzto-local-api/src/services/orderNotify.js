import { Restaurant, Order } from '../models/index.js'
import { pubsub } from '../graphql/orderPubsub.js'

const ORDER_CHANGED = 'ORDER_CHANGED'

const ONLINE_CARD = new Set(['STRIPE', 'PAYPAL'])

export const isOnlineCardMethod = (method) =>
  ONLINE_CARD.has(String(method || '').toUpperCase())

/** Kitchen must not see unpaid Stripe/PayPal checkouts. */
export const kitchenOrdersMongoFilter = (restaurantId) => ({
  restaurantId,
  $nor: [
    {
      paymentMethod: { $in: ['STRIPE', 'PAYPAL', 'stripe', 'paypal'] },
      paymentStatus: { $nin: ['PAID', 'paid'] }
    }
  ]
})

/**
 * @param {object} orderDoc
 * @param {object} serialized
 * @param {string} origin
 * @param {{ notifyKitchen?: boolean }} [opts]
 */
export async function publishOrderChanged(
  orderDoc,
  serialized,
  origin,
  { notifyKitchen = true } = {}
) {
  const recipients = new Set()
  const customerId = orderDoc?.customerId
  if (customerId) recipients.add(String(customerId))

  if (notifyKitchen) {
    const restaurantId = orderDoc?.restaurantId
    if (restaurantId) {
      const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean()
      if (restaurant?.ownerId) recipients.add(String(restaurant.ownerId))
    }
  }

  for (const userId of recipients) {
    pubsub.publish(ORDER_CHANGED, {
      orderStatusChanged: {
        userId,
        origin,
        order: serialized
      }
    })
  }
}

/**
 * Records a settled Stripe payment.
 *
 * @param {object} order            Mongoose order document.
 * @param {Function} serializeOrder Injected to avoid a circular import.
 * @param {string|object|null} paymentIntentId
 * @param {number|null} paidAmount  Amount Stripe actually captured (major
 *   units). Required by callers that settle a payment: recording
 *   `paidAmount = orderAmount` unconditionally would let an underpaid or
 *   unverified session look fully paid.
 */
export async function markStripeOrderPaid(
  order,
  serializeOrder,
  paymentIntentId = null,
  paidAmount = null
) {
  if (!order) return null
  if (String(order.paymentStatus || '').toUpperCase() === 'PAID') {
    return order
  }

  const expected = Number(order.orderAmount || 0)
  const captured = paidAmount == null ? expected : Number(paidAmount)
  // Tolerate sub-grosz rounding only.
  if (!Number.isFinite(captured) || captured + 0.01 < expected) {
    console.warn(
      `[payments] refusing to settle ${order.orderId}: captured ${captured} < expected ${expected}`
    )
    return order
  }

  order.paymentStatus = 'PAID'
  order.paidAmount = captured
  // Kitchen sees the order only after Stripe succeeds — start the tablet alarm.
  order.isRinged = true
  if (paymentIntentId) {
    let piId = paymentIntentId
    if (typeof paymentIntentId === 'object' && paymentIntentId.id) {
      piId = paymentIntentId.id
    }
    order.stripePaymentIntentId = piId
  }
  await order.save()
  const serialized = await serializeOrder(order.toObject())
  // Now kitchen learns about the order for the first time.
  await publishOrderChanged(order, serialized, 'stripePaid', { notifyKitchen: true })
  return order
}

export async function cancelUnpaidOnlineOrder(orderId, serializeOrder) {
  const order =
    (await Order.findOne({ orderId })) ||
    (await Order.findById(orderId).catch(() => null))
  if (!order) return null
  if (!isOnlineCardMethod(order.paymentMethod)) return order
  if (String(order.paymentStatus || '').toUpperCase() === 'PAID') return order
  if (String(order.orderStatus || '').toUpperCase() === 'CANCELLED') return order

  order.orderStatus = 'CANCELLED'
  order.paymentStatus = 'CANCELLED'
  order.cancelledAt = new Date()
  await order.save()
  const serialized = await serializeOrder(order.toObject())
  // Customer only — kitchen never saw this unpaid order.
  await publishOrderChanged(order, serialized, 'stripeCancel', { notifyKitchen: false })
  return order
}
