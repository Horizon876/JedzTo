/**
 * resolvers/restaurant.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Restaurant building, listing and ETA broadcasting functions shared across
 * query, mutation and subscription resolver modules.
 */

import { GraphQLError } from 'graphql'
import { Restaurant, Category, Food, User } from '../../models/index.js'
import { assertPublicAccess } from '../../auth/jwt.js'
import { liveCategories, mapFood } from '../../services/menu.js'
import { rewriteUploadUrl } from '../../utils/publicUrl.js'
import { withCurrentEta, withCurrentEtas, resolveDefaultEta, computeCurrentEta } from '../../services/eta.js'
import { canAcceptOrders, restaurantUnavailableReason } from '../../services/restaurantAvailability.js'
import {
  id,
  toPreview,
  audienceFor,
  publishedCategories,
  resolveDelivery,
  mapDeliveryArea,
  slugify
} from './helpers.js'
import { withGoogleRating, googleReviewsPayload } from '../../services/googleReviews.js'
import { pubsub, RESTAURANT_UPDATED } from '../orderPubsub.js'

// ---------------------------------------------------------------------------
// Internal: ETA broadcasting
// ---------------------------------------------------------------------------

export const publishRestaurantTimes = (restaurant) => {
  if (!restaurant?._id) return
  const plain = typeof restaurant.toObject === 'function' ? restaurant.toObject() : restaurant
  Promise.resolve(withCurrentEta(plain))
    .then((enriched) => {
      const eta = Number(enriched.currentEta)
      pubsub.publish(RESTAURANT_UPDATED, {
        subscriptionRestaurantUpdated: {
          _id: String(enriched._id),
          deliveryTime: eta,
          pickupTime: eta,
          defaultEta: resolveDefaultEta(enriched),
          isBusy: Boolean(enriched.isBusy),
          currentEta: eta
        }
      })
    })
    .catch(() => {})
}

// ---------------------------------------------------------------------------
// Internal: full restaurant tree builder
// ---------------------------------------------------------------------------

export async function buildRestaurantTree(restaurant, { audience = 'owner', latitude, longitude } = {}) {
  if (!restaurant) return null

  const categories =
    audience === 'customer'
      ? publishedCategories(restaurant)
      : await liveCategories(restaurant._id)
  const delivery = resolveDelivery(restaurant, latitude, longitude)
  const withEta =
    audience === 'customer' && restaurant.currentEta == null
      ? await withCurrentEta(restaurant)
      : restaurant

  return {
    ...withEta,
    _id: id(withEta),
    orderId: id(withEta),
    ownerId: id(withEta.ownerId) || String(withEta.ownerId),
    image: rewriteUploadUrl(withEta.image),
    logo: rewriteUploadUrl(withEta.logo),
    defaultEta: resolveDefaultEta(withEta),
    isBusy: Boolean(withEta.isBusy),
    isSuspended: Boolean(withEta.isSuspended),
    suspendedReason: withEta.suspendedReason || '',
    pausedUntil: withEta.pausedUntil
      ? new Date(withEta.pausedUntil).toISOString()
      : null,
    holidayExceptions: (withEta.holidayExceptions || []).map((h) => ({
      _id: id(h),
      date: h.date,
      closed: h.closed !== false,
      open: h.open || null,
      close: h.close || null,
      label: h.label || ''
    })),
    freeDeliveryFrom: Number(withEta.freeDeliveryFrom ?? 0),
    commissionRate:
      withEta.commissionRate == null ? 10 : Number(withEta.commissionRate),
    isAvailable:
      audience === 'customer'
        ? canAcceptOrders(withEta)
        : withEta.isAvailable !== false,
    currentEta:
      withEta.currentEta != null
        ? Number(withEta.currentEta)
        : computeCurrentEta(withEta, null),
    deliveryTime:
      withEta.currentEta != null
        ? Number(withEta.currentEta)
        : computeCurrentEta(withEta, null),
    pickupTime:
      withEta.currentEta != null
        ? Number(withEta.currentEta)
        : computeCurrentEta(withEta, null),
    reviewData: (() => {
      const google = googleReviewsPayload(withEta)
      if (google.total || google.reviews?.length) {
        return {
          total: google.total,
          ratings: google.ratings,
          reviews: google.reviews
        }
      }
      return {
        total: withEta.reviewCount || 0,
        ratings: withEta.reviewAverage || 0,
        reviews: []
      }
    })(),
    reviewCount: withGoogleRating(withEta).reviewCount,
    reviewAverage: withGoogleRating(withEta).reviewAverage,
    rating: withGoogleRating(withEta).rating,
    options: withEta.options || [],
    addons: withEta.addons || [],
    deliveryAreas: (withEta.deliveryAreas || []).map(mapDeliveryArea),
    deliveryFee: delivery.fee,
    deliveryAreaName: delivery.areaName,
    // Zone-based minimum whenever we know the customer location — including
    // when an owner is browsing the customer app.
    minimumOrder:
      latitude != null && longitude != null && delivery.minOrder != null
        ? delivery.minOrder
        : withEta.minimumOrder,
    menuPublishedAt: withEta.menuPublishedAt?.toISOString?.() || withEta.menuPublishedAt || null,
    hasUnpublishedMenuChanges: Boolean(withEta.hasUnpublishedMenuChanges),
    bussinessDetails:
      audience === 'customer'
        ? {
            companyRegNo: withEta.bussinessDetails?.companyRegNo || null,
            bussinessRegNo: withEta.bussinessDetails?.bussinessRegNo || null
          }
        : withEta.bussinessDetails || null,
    categories
  }
}

export async function buildRestaurantTreeById(restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).lean()
  if (!restaurant) throw new GraphQLError('Restaurant not found')
  return buildRestaurantTree(restaurant)
}

/**
 * Lists the restaurants a customer at (latitude, longitude) can order from.
 * Batches ETA computation (single DB aggregation) instead of N per-restaurant queries.
 */
export async function listRestaurants({ shopType, latitude, longitude } = {}) {
  const filter = { isActive: true }
  if (shopType) filter.shopType = shopType
  const rows = await Restaurant.find(filter).lean()
  const deliverable = rows.filter(
    (r) =>
      canAcceptOrders(r) && resolveDelivery(r, latitude, longitude).available
  )
  const withEtas = await withCurrentEtas(deliverable)
  return Promise.all(
    withEtas.map((r) =>
      buildRestaurantTree(r, { audience: 'customer', latitude, longitude })
    )
  )
}

// ---------------------------------------------------------------------------
// Exported: resolver type field resolvers for Restaurant
// ---------------------------------------------------------------------------

/**
 * Loads the owner once per restaurant object, even when both `owner` and
 * `username` are selected. Must cache a real Promise — caching the Mongoose
 * Query itself causes "Query was already executed" when GraphQL awaits it
 * twice (owner + username in parallel), which Apollo then treats as a hard
 * failure and the admin stores table renders empty.
 */
const ownerOf = (parent) => {
  if (!parent.ownerId) return Promise.resolve(null)
  if (!parent.__ownerPromise) {
    parent.__ownerPromise = User.findById(parent.ownerId)
      .select('email isActive')
      .lean()
      .exec()
  }
  return parent.__ownerPromise
}

export const RestaurantFieldResolvers = {
  owner: async (parent) => {
    const owner = await ownerOf(parent)
    if (!owner) return null
    return { _id: id(owner), email: owner.email, isActive: owner.isActive !== false }
  },
  slug: (parent) => slugify(parent.name || ''),
  username: async (parent) => (await ownerOf(parent))?.email || null,
  // Was hardcoded to 0, which silently hid the real commission from the admin
  // panel and from settlement previews.
  commissionRate: (parent) =>
    parent.commissionRate == null ? 10 : Number(parent.commissionRate),
  unique_restaurant_id: (parent) => parent._id
}
