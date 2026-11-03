/**
 * resolvers/helpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility functions and shared data shapes used across all resolver
 * modules. No DB calls, no GraphQL errors — just transformations.
 */

import { GraphQLError } from 'graphql'
import { withCurrentEta, computeCurrentEta, resolveDefaultEta } from '../../services/eta.js'
import { rewriteUploadUrl } from '../../utils/publicUrl.js'
import { mapFood } from '../../services/menu.js'
import { canAcceptOrders } from '../../services/restaurantAvailability.js'
import { withGoogleRating, googleReviewsPayload } from '../../services/googleReviews.js'
import { SHOW_ALL_RESTAURANTS } from '../../config.js'

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

/** Stringify a Mongoose ObjectId / document _id for GraphQL ID fields. */
export const id = (doc) => {
  if (doc == null || doc === '') return null
  if (typeof doc === 'string' || typeof doc === 'number') return String(doc)
  if (typeof doc.toHexString === 'function') return doc.toHexString()
  if (doc._id != null) return id(doc._id)
  try {
    const asString = String(doc)
    if (asString && asString !== '[object Object]') return asString
  } catch {
    /* ignore */
  }
  return null
}

/** Safely parse a number, returning `fallback` for non-finite values. */
export const toCoord = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Coordinate guards. Mongo happily stores 1e308 as a latitude, which then
 * poisons every distance calculation, so values are validated at the edge.
 */
const clampCoord = (value, limit, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : fallback
}
export const toLatitude = (value, fallback = 0) => clampCoord(value, 90, fallback)
export const toLongitude = (value, fallback = 0) => clampCoord(value, 180, fallback)

/** Clamp an ETA value in minutes to a sane range [min, 240]. */
export const clampEtaMinutes = (value, fallback = 20, { min = 5 } = {}) => {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(240, n))
}

/** URL-friendly slug from any string. */
export const slugify = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres (Haversine). */
export const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Compares area names the way a person would: "Myślenice" and "Myslenice"
 * are the same place, so the owner cannot accidentally price it twice.
 */
export const normalizeAreaName = (name) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')

// ---------------------------------------------------------------------------
// ETA helpers
// ---------------------------------------------------------------------------

/**
 * Applies prep + delivery ETA fields to an order document and recomputes
 * the absolute expectedTime timestamps.
 */
export const applyOrderEtaFields = (
  order,
  { preparationEtaMinutes, deliveryEtaMinutes } = {},
  nowMs = Date.now()
) => {
  const isPickup = Boolean(order.isPickedUp)
  if (preparationEtaMinutes != null) {
    order.preparationEtaMinutes = clampEtaMinutes(preparationEtaMinutes)
  }
  if (deliveryEtaMinutes != null) {
    order.deliveryEtaMinutes = isPickup
      ? 0
      : clampEtaMinutes(deliveryEtaMinutes, 0, { min: 0 })
  }

  const prep = Number(order.preparationEtaMinutes ?? 0)
  const delivery = isPickup ? 0 : Number(order.deliveryEtaMinutes ?? 0)
  const total = Math.max(5, prep + delivery)

  order.preparationTime = new Date(nowMs + prep * 60 * 1000)
  order.expectedTime = new Date(nowMs + total * 60 * 1000)
  if (!isPickup) {
    order.deliveryExpectedTime = order.expectedTime
  }
  return { prep, delivery, total }
}

// ---------------------------------------------------------------------------
// Delivery area helpers
// ---------------------------------------------------------------------------

export const mapDeliveryArea = (a) => ({
  _id: id(a) || String(a._id),
  name: a.name,
  fee: a.fee ?? 0,
  minOrder: a.minOrder ?? 0,
  latitude: a.latitude,
  longitude: a.longitude,
  radiusKm: a.radiusKm ?? 3,
  isActive: a.isActive !== false
})

/** Returns the best delivery area covering (latitude, longitude).
 * Zones are adjacent regions (not nested rings), so we do NOT pick the
 * smallest radius — that wrongly assigned border towns like Rudnik to a
 * tighter neighbouring zone with a higher minOrder.
 * Prefer: lowest minOrder → lowest fee → closest centre.
 */
export const matchDeliveryArea = (restaurant, latitude, longitude) => {
  const areas = (restaurant?.deliveryAreas || []).filter((a) => a.isActive !== false)
  if (!areas.length) return null
  const covering = areas
    .filter((a) => distanceKm(latitude, longitude, a.latitude, a.longitude) <= a.radiusKm)
    .map((a) => ({
      area: a,
      dist: distanceKm(latitude, longitude, a.latitude, a.longitude)
    }))
    .sort((a, b) => {
      const minDiff = Number(a.area.minOrder ?? 0) - Number(b.area.minOrder ?? 0)
      if (minDiff !== 0) return minDiff
      const feeDiff = Number(a.area.fee ?? 0) - Number(b.area.fee ?? 0)
      if (feeDiff !== 0) return feeDiff
      return a.dist - b.dist
    })
  return covering[0]?.area || null
}

/**
 * Resolves deliverability for a restaurant at a location. A restaurant with
 * no areas configured yet is treated as "delivers everywhere" so a freshly
 * created store is not invisible before its owner sets things up.
 */
export const resolveDelivery = (restaurant, latitude, longitude) => {
  const areas = (restaurant?.deliveryAreas || []).filter((a) => a.isActive !== false)
  if (!areas.length) return { available: true, fee: null, minOrder: null, areaName: null }
  if (latitude == null || longitude == null) {
    return { available: true, fee: null, minOrder: null, areaName: null }
  }
  const area = matchDeliveryArea(restaurant, latitude, longitude)
  if (!area) {
    if (SHOW_ALL_RESTAURANTS) {
      return {
        available: true,
        fee: 0,
        minOrder: restaurant?.minimumOrder ?? 0,
        areaName: null
      }
    }
    return { available: false, fee: null, minOrder: null, areaName: null }
  }
  return {
    available: true,
    fee: area.fee ?? 0,
    minOrder: area.minOrder ?? 0,
    areaName: area.name
  }
}

// ---------------------------------------------------------------------------
// Restaurant data shapes
// ---------------------------------------------------------------------------

/**
 * Lightweight preview shape used in listing queries (no categories loaded).
 * Mirrors the legacy deliveryTime/pickupTime fields so older UI works.
 */
export const toPreview = (r) => {
  const rated = withGoogleRating(r)
  const currentEta =
    rated.currentEta == null ? resolveDefaultEta(rated) : Number(rated.currentEta)
  return {
    _id: id(rated),
    name: rated.name,
    image: rated.image,
    logo: rated.logo,
    deliveryTime: currentEta,
    pickupTime: currentEta,
    defaultEta: rated.defaultEta == null ? resolveDefaultEta(rated) : Number(rated.defaultEta),
    isBusy: Boolean(rated.isBusy),
    currentEta,
    minimumOrder: rated.minimumOrder,
    isAvailable: canAcceptOrders(rated),
    isSuspended: Boolean(rated.isSuspended),
    pausedUntil: rated.pausedUntil ? new Date(rated.pausedUntil).toISOString() : null,
    tax: rated.tax,
    shopType: rated.shopType,
    cuisines: rated.cuisines,
    tags: rated.tags,
    reviewCount: rated.reviewCount,
    reviewAverage: rated.reviewAverage,
    freeDelivery: rated.freeDelivery,
    acceptVouchers: rated.acceptVouchers,
    location: rated.location,
    openingTimes: rated.openingTimes,
    deliveryFee: rated.deliveryFee ?? null,
    deliveryAreaName: rated.deliveryAreaName ?? null,
    address: rated.address ?? null
  }
}

export function publishedCategories(restaurant) {
  const snapshot = restaurant?.publishedMenu
  if (!snapshot || !Array.isArray(snapshot.categories)) return []
  // Snapshot is stored as plain Mongo documents — ObjectId values must be
  // stringified before GraphQL's ID scalar sees them (otherwise: "ID cannot
  // represent value: { buffer: … }").
  return snapshot.categories.map((category) => ({
    _id: id(category) || (category?._id ? String(category._id) : null),
    title: category.title,
    image: rewriteUploadUrl(category.image || ''),
    restaurantId:
      id({ _id: category.restaurantId }) ||
      (category.restaurantId ? String(category.restaurantId) : null),
    foods: (category.foods || []).map((food) => mapFood(food)),
    createdAt: category.createdAt?.toISOString?.() || category.createdAt || null,
    updatedAt: category.updatedAt?.toISOString?.() || category.updatedAt || null
  }))
}

/**
 * Determines whether the caller should see the live (draft) menu or the
 * customer-facing published snapshot.
 */
export const audienceFor = (ctx, restaurant) => {
  const user = ctx?.user
  if (!user?.userId) return 'customer'
  if (user.role === 'SUPER_ADMIN') return 'owner'
  if (
    user.role === 'RESTAURANT_OWNER' &&
    String(restaurant.ownerId) === String(user.userId)
  ) {
    return 'owner'
  }
  return 'customer'
}

// ---------------------------------------------------------------------------
// Role shape helpers
// ---------------------------------------------------------------------------

export const mapUserType = (role) => {
  if (role === 'SUPER_ADMIN') return 'ADMIN'
  if (role === 'RESTAURANT_OWNER') return 'RESTAURANT'
  if (role === 'RIDER') return 'RIDER'
  return 'CUSTOMER'
}

/** Rider list/detail shape for admin + restaurant panels. */
export const riderShape = (user, restaurantName = null) => ({
  _id: id(user),
  name: user.name,
  username: String(user.email || '').split('@')[0],
  available: user.available !== false,
  acceptExtraOrders: Boolean(user.acceptExtraOrders),
  phone: user.phone || '',
  restaurantId: user.restaurantId ? id(user.restaurantId) : null,
  restaurantName: restaurantName || null,
  assigned: Boolean(user.restaurantId),
  vehicleType: null,
  zone: null,
  location: null
})

export const USER_FEATURE_KEYS = ['ordering', 'login', 'coupons']

export const featureBlockShape = (block) => ({
  feature: String(block.feature || ''),
  until: block.until?.toISOString?.() || block.until || null,
  reason: block.reason || '',
  createdAt: block.createdAt?.toISOString?.() || block.createdAt || null
})

/** Active (not expired) feature blocks for a user document. */
export const activeFeatureBlocks = (user, now = new Date()) =>
  (user?.featureBlocks || [])
    .filter((b) => b?.feature && b?.until && new Date(b.until) > now)
    .map(featureBlockShape)

export const isFeatureBlocked = (user, feature, now = new Date()) =>
  activeFeatureBlocks(user, now).some((b) => b.feature === feature)

export const assertFeatureNotBlocked = (user, feature, message) => {
  if (!isFeatureBlocked(user, feature)) return
  throw new GraphQLError(message || 'Funkcja tymczasowo zablokowana', {
    extensions: { code: 'FEATURE_BLOCKED', feature }
  })
}

export const adminUserShape = (user) => {
  const adminStatus = String(user.adminStatus || '').toLowerCase()
  let status = 'active'
  if (user.isActive === false || adminStatus === 'blocked') status = 'blocked'
  else if (adminStatus === 'deactivate' || adminStatus === 'inactive') status = 'deactivate'

  return {
    _id: id(user),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    phoneIsVerified: Boolean(user.phoneIsVerified),
    createdAt: user.createdAt?.toISOString?.() || user.createdAt || null,
    userType: mapUserType(user.role),
    status,
    lastLogin: null,
    notes: user.notes || '',
    isGuest: Boolean(user.isGuest),
    featureBlocks: activeFeatureBlocks(user),
    addresses: (user.addresses || []).map((a) => ({
      _id: id(a) || String(a._id),
      id: id(a) || String(a._id),
      label: a.label,
      deliveryAddress: a.deliveryAddress,
      details: a.details,
      location: a.location,
      selected: a.selected
    }))
  }
}

export const couponShape = (doc) => ({
  _id: String(doc._id),
  title: doc.title,
  discount: doc.discount,
  discountType: doc.discountType === 'fixed' ? 'fixed' : 'percent',
  enabled: doc.enabled,
  restaurantId: doc.restaurantId ? String(doc.restaurantId) : null,
  minOrderValue: doc.minOrderValue,
  usageLimit: doc.usageLimit,
  usedCount: doc.usedCount
})

export const profileShape = (user) => ({
  _id: id(user),
  name: user.name,
  phone: user.phone,
  phoneIsVerified: user.phoneIsVerified,
  email: user.email,
  emailIsVerified: user.emailIsVerified,
  notificationToken: user.notificationToken,
  isActive: user.isActive,
  available: user.available !== false,
  acceptExtraOrders: Boolean(user.acceptExtraOrders),
  restaurantId: user.restaurantId ? String(user.restaurantId) : null,
  isOrderNotification: user.isOrderNotification,
  isOfferNotification: user.isOfferNotification,
  role: user.role,
  favourite: (user.favourite || []).map(String),
  addresses: (user.addresses || []).map((a) => ({
    _id: id(a) || String(a._id),
    id: id(a) || String(a._id),
    label: a.label,
    deliveryAddress: a.deliveryAddress,
    details: a.details,
    location: a.location,
    selected: a.selected
  }))
})
