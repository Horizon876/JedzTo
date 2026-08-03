/**
 * resolvers/subscriptions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GraphQL Subscription resolvers — all PubSub event streams.
 */

import { withFilter } from 'graphql-subscriptions'
import {
  pubsub,
  ORDER_STATUS,
  ORDER_CHANGED,
  RIDER_LOCATION,
  CHAT_MESSAGE,
  RESTAURANT_UPDATED
} from '../orderPubsub.js'

export const subscriptions = {
  subscriptionOrder: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([ORDER_STATUS]),
      (payload, variables) =>
        payload.subscriptionOrder?._id === variables.id ||
        payload.subscriptionOrder?.orderId === variables.id
    )
  },
  subscriptionRiderLocation: {
    subscribe: () => pubsub.asyncIterableIterator([RIDER_LOCATION])
  },
  orderStatusChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([ORDER_CHANGED]),
      (payload, variables) =>
        payload.orderStatusChanged?.userId === variables.userId
    )
  },
  subscriptionNewMessage: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator([CHAT_MESSAGE]),
      (payload, variables) => payload.orderId === variables.order
    )
  },
  subscriptionRestaurantUpdated: {
    subscribe: () => pubsub.asyncIterableIterator([RESTAURANT_UPDATED])
  }
}
