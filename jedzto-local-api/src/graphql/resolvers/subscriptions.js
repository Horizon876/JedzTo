/**
 * resolvers/subscriptions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GraphQL Subscription resolvers — all PubSub event streams.
 *
 * Subscriptions are an authorization surface like any other: the filters below
 * are driven by the *connection's* identity, never by the id the client asks
 * for. Filtering purely on client-supplied variables (the previous behaviour)
 * let anyone stream another customer's orders, addresses and phone number.
 */

import { withFilter } from 'graphql-subscriptions'
import { Order } from '../../models/index.js'
import {
  pubsub,
  ORDER_STATUS,
  ORDER_CHANGED,
  RIDER_LOCATION,
  CHAT_MESSAGE,
  RESTAURANT_UPDATED
} from '../orderPubsub.js'

/** True when `user` is a party to `order` (customer, its restaurant, or admin). */
const canSeeOrder = (order, user) => {
  if (!user?.userId || !order) return false
  if (user.role === 'SUPER_ADMIN') return true
  const customerId = String(order.customerId || order.user?._id || '')
  if (customerId && customerId === String(user.userId)) return true
  return (
    user.role === 'RESTAURANT_OWNER' &&
    Boolean(user.restaurantId) &&
    String(order.restaurantId || '') === String(user.restaurantId)
  )
}

export const subscriptions = {
  subscriptionOrder: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([ORDER_STATUS]),
      (payload, variables, context) => {
        const order = payload.subscriptionOrder
        const matchesRequest = order?._id === variables.id || order?.orderId === variables.id
        return matchesRequest && canSeeOrder(order, context?.user)
      }
    )
  },

  subscriptionRiderLocation: {
    subscribe: () => pubsub.asyncIterableIterator([RIDER_LOCATION])
  },

  orderStatusChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([ORDER_CHANGED]),
      // The stream is bound to the authenticated user; `variables.userId` is
      // only honoured when it is the caller's own id.
      (payload, _variables, context) =>
        Boolean(context?.user?.userId) &&
        payload.orderStatusChanged?.userId === String(context.user.userId)
    )
  },

  subscriptionNewMessage: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([CHAT_MESSAGE]),
      async (payload, variables, context) => {
        if (payload.orderId !== variables.order) return false
        const order = await Order.findById(payload.orderId)
          .select('customerId restaurantId')
          .lean()
          .catch(() => null)
        return canSeeOrder(order, context?.user)
      }
    )
  },

  // Public data only (ETA / busy flag), safe to broadcast to every client.
  subscriptionRestaurantUpdated: {
    subscribe: () => pubsub.asyncIterableIterator([RESTAURANT_UPDATED])
  }
}
