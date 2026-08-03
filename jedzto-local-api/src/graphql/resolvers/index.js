/**
 * resolvers/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Root resolver object that merges all domain modules.
 * Each module owns one slice of the schema:
 *
 *   helpers.js        — pure utilities (no resolvers)
 *   restaurant.js     — buildRestaurantTree, listRestaurants, field resolvers
 *   orders.js         — serializeOrder, pagination, search helpers
 *   auth.js           — login, registration, OTP, token refresh
 *   queries.js        — all Query resolvers
 *   menu.js           — category / food item / publish mutations
 *   admin.js          — order status, restaurant CRUD, shop types
 *   subscriptions.js  — PubSub event streams
 */

import { pubsub } from '../orderPubsub.js'
import { queries } from './queries.js'
import { authMutations } from './auth.js'
import { menuMutations } from './menu.js'
import { adminMutations } from './admin.js'
import { subscriptions } from './subscriptions.js'
import { RestaurantFieldResolvers } from './restaurant.js'

// Re-export serializeOrder so legacy imports (stripe.js) continue working.
export { serializeOrder } from './orders.js'
export { pubsub }

export const resolvers = {
  Query: queries,

  Mutation: {
    ...authMutations,
    ...menuMutations,
    ...adminMutations
  },

  Restaurant: RestaurantFieldResolvers,

  Subscription: subscriptions
}
