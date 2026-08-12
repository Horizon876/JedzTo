/**
 * resolvers/orders.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Order serialization, search helpers, pagination and the serializeOrder
 * function exported for use from the Stripe webhook route.
 */

import { GraphQLError } from 'graphql'
import { Order, Restaurant, User } from '../../models/index.js'
import { requireUser } from '../../auth/jwt.js'
import { resolveDefaultEta, computeCurrentEta } from '../../services/eta.js'
import { containsFilter, clampPageSize, clampNonNegative } from '../../utils/sanitize.js'
import { id } from './helpers.js'

// ---------------------------------------------------------------------------
// Active order statuses
// ---------------------------------------------------------------------------

export const ACTIVE = new Set(['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'PREPARING'])
export const CANCELLED = new Set(['CANCELLED', 'REJECTED'])

/** Upper bound for any client-controlled order page size. */
export const MAX_ORDER_PAGE_SIZE = 100

// ---------------------------------------------------------------------------
// Order serialization (shared with Stripe route via named export)
// ---------------------------------------------------------------------------

/** Fields serializeOrder needs from the related documents — nothing more. */
const RESTAURANT_FIELDS =
  '_id name image address location zone defaultEta pickupTime deliveryTime isBusy currentEta acceptedEtaMinutes'
const CUSTOMER_FIELDS = '_id name phone email'

/**
 * Serializes a single order. `related` lets callers inject already-loaded
 * documents so batch serialization does not re-query per order.
 *
 * @param {object} order
 * @param {{ restaurant?: object|null, user?: object|null }} [related]
 */
export async function serializeOrder(order, related = null) {
  const restaurant =
    related && 'restaurant' in related
      ? related.restaurant
      : await Restaurant.findById(order.restaurantId).select(RESTAURANT_FIELDS).lean()
  const user =
    related && 'user' in related
      ? related.user
      : await User.findById(order.customerId).select(CUSTOMER_FIELDS).lean()
  const iso = (d) => (d ? new Date(d).toISOString() : null)

  return {
    ...order,
    _id: id(order),
    id: id(order),
    restaurantId: id(order.restaurantId),
    restaurant: restaurant
      ? (() => {
          const eta = computeCurrentEta(restaurant)
          return {
            _id: id(restaurant),
            name: restaurant.name,
            image: restaurant.image,
            address: restaurant.address,
            location: restaurant.location,
            defaultEta: resolveDefaultEta(restaurant),
            isBusy: Boolean(restaurant.isBusy),
            currentEta: eta,
            deliveryTime: eta,
            pickupTime: eta
          }
        })()
      : null,
    user: user
      ? { _id: id(user), name: user.name, phone: user.phone, email: user.email }
      : null,
    deliveryAddress: {
      ...order.deliveryAddress,
      id: id(order.deliveryAddress) || `addr-${id(order)}`
    },
    items: (order.items || []).map((item) => ({
      ...item,
      _id: id(item),
      id: id(item),
      food: String(item.food || ''),
      variation: item.variation
        ? {
            ...item.variation,
            _id: String(item.variation._id || ''),
            id: String(item.variation._id || '')
          }
        : null,
      addons: (item.addons || []).map((addon) => ({
        ...addon,
        _id: String(addon._id || ''),
        options: (addon.options || []).map((opt) => ({
          ...opt,
          _id: String(opt._id || ''),
          id: String(opt._id || '')
        }))
      }))
    })),
    review: order.review
      ? {
          _id: id(order.review) || String(order.review._id || order._id),
          rating: order.review.rating ?? null,
          description: order.review.description || '',
          comments: order.review.comments || '',
          isActive: order.review.isActive !== false,
          createdAt: iso(order.review.createdAt),
          updatedAt: iso(order.review.updatedAt)
        }
      : null,
    status: ACTIVE.has(order.orderStatus),
    isActive: ACTIVE.has(order.orderStatus),
    reason: order.reason || '',
    zone: restaurant?.zone
      ? { _id: restaurant.zone._id, title: restaurant.zone.title, tax: restaurant.zone.tax }
      : null,
    createdAt: iso(order.createdAt),
    orderDate: iso(order.orderDate),
    expectedTime: iso(order.expectedTime),
    preparationTime: iso(order.preparationTime),
    completionTime: iso(order.completionTime),
    preparationEtaMinutes:
      order.preparationEtaMinutes == null ? null : Number(order.preparationEtaMinutes),
    deliveryEtaMinutes:
      order.deliveryEtaMinutes == null ? null : Number(order.deliveryEtaMinutes),
    deliveryExpectedTime: iso(order.deliveryExpectedTime),
    acceptedEtaMinutes:
      order.acceptedEtaMinutes == null ? null : Number(order.acceptedEtaMinutes),
    platformCommissionRate:
      order.platformCommissionRate == null ? null : Number(order.platformCommissionRate),
    platformCommission:
      order.platformCommission == null ? null : Number(order.platformCommission),
    stripePaymentIntentId: order.stripePaymentIntentId || null,
    refundedAt: iso(order.refundedAt),
    refundAmount: order.refundAmount == null ? null : Number(order.refundAmount),
    acceptedAt: iso(order.acceptedAt),
    pickedAt: iso(order.pickedAt),
    deliveredAt: iso(order.deliveredAt),
    cancelledAt: iso(order.cancelledAt),
    assignedAt: iso(order.assignedAt),
    isRinged:
      order.isRinged == null
        ? String(order.orderStatus || '').toUpperCase() === 'PENDING'
        : Boolean(order.isRinged),
    isRiderRinged: Boolean(order.isRiderRinged)
  }
}

/**
 * Serializes a list of orders with a fixed number of queries (3 instead of
 * 1 + 2N). A 200-order admin page used to fire 401 queries.
 */
export async function serializeOrders(orders) {
  if (!orders?.length) return []

  const restaurantIds = [...new Set(orders.map((o) => String(o.restaurantId || '')).filter(Boolean))]
  const customerIds = [...new Set(orders.map((o) => String(o.customerId || '')).filter(Boolean))]

  const [restaurants, users] = await Promise.all([
    Restaurant.find({ _id: { $in: restaurantIds } }).select(RESTAURANT_FIELDS).lean(),
    User.find({ _id: { $in: customerIds } }).select(CUSTOMER_FIELDS).lean()
  ])

  const restaurantById = new Map(restaurants.map((r) => [String(r._id), r]))
  const userById = new Map(users.map((u) => [String(u._id), u]))

  return Promise.all(
    orders.map((order) =>
      serializeOrder(order, {
        restaurant: restaurantById.get(String(order.restaurantId)) || null,
        user: userById.get(String(order.customerId)) || null
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Search / filter helpers
// ---------------------------------------------------------------------------

/** Caps how many ids a free-text search may expand into (memory guard). */
const SEARCH_ID_LIMIT = 500

export const orderSearchFilter = async (search) => {
  if (!search) return {}
  // Escaped: an unescaped $regex is both a filter bypass and a ReDoS vector.
  const rx = containsFilter(search)
  const [users, restaurants] = await Promise.all([
    User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .select('_id')
      .limit(SEARCH_ID_LIMIT)
      .lean(),
    Restaurant.find({ name: rx }).select('_id').limit(SEARCH_ID_LIMIT).lean()
  ])
  return {
    $or: [
      { orderId: rx },
      { customerId: { $in: users.map((u) => u._id) } },
      { restaurantId: { $in: restaurants.map((r) => r._id) } }
    ]
  }
}

export const orderStatusFilter = (orderStatus) =>
  orderStatus?.length ? { orderStatus: { $in: orderStatus } } : {}

export const DATE_KEYWORD_DAYS = { Today: 1, 'Last 7 days': 7, 'Last 30 days': 30, All: null }

export function statsDateRange({ startingDate, endingDate, dateKeyword }) {
  if (dateKeyword && dateKeyword in DATE_KEYWORD_DAYS) {
    const days = DATE_KEYWORD_DAYS[dateKeyword]
    if (days === null) return {}
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (days - 1))
    return { createdAt: { $gte: from } }
  }
  const range = {}
  if (startingDate) range.$gte = new Date(startingDate)
  if (endingDate) range.$lte = new Date(endingDate)
  return Object.keys(range).length ? { createdAt: range } : {}
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export async function paginateOrders(baseFilter, { page = 1, rows = 10 }) {
  // Hard cap: `rows` comes straight from the client, so an unbounded value
  // would let one request pull the whole orders collection.
  const limit = clampPageSize(rows, 10, MAX_ORDER_PAGE_SIZE)
  const currentPage = Math.max(1, clampNonNegative(page, 1))
  const [totalCount, docs] = await Promise.all([
    Order.countDocuments(baseFilter),
    Order.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean()
  ])
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  return {
    orders: await serializeOrders(docs),
    totalCount,
    currentPage,
    totalPages,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < totalPages ? currentPage + 1 : null
  }
}

// ---------------------------------------------------------------------------
// Authorization helper
// ---------------------------------------------------------------------------

const forbidden = (message = 'FORBIDDEN') =>
  new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } })

export const assertCanReadRestaurantOrders = async (ctx, restaurantId) => {
  const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
  if (auth.role === 'SUPER_ADMIN') return auth
  const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean()
  if (!restaurant || String(restaurant.ownerId) !== String(auth.userId)) {
    throw forbidden()
  }
  return auth
}

/**
 * Loads an order the caller is allowed to touch, accepting either the Mongo
 * _id or the human `orderId` ("JT12345678").
 *
 * Every order resolver must go through this: order ids are short and
 * sequential, so "authenticated" alone is not an authorization decision — it
 * used to be enough to read or cancel any stranger's order.
 *
 * @param {object} ctx
 * @param {string} orderRef
 * @param {{ lean?: boolean, roles?: string[]|null }} [options]
 */
export const loadAuthorizedOrder = async (ctx, orderRef, { lean = false, roles = null } = {}) => {
  const auth = requireUser(ctx, roles)
  const query = Order.findOne({
    $or: [
      { orderId: String(orderRef ?? '') },
      ...(/^[0-9a-fA-F]{24}$/.test(String(orderRef ?? '')) ? [{ _id: orderRef }] : [])
    ]
  })
  const order = await (lean ? query.lean() : query)
  if (!order) throw new GraphQLError('Order not found', { extensions: { code: 'BAD_USER_INPUT' } })

  if (auth.role === 'SUPER_ADMIN') return { auth, order }
  if (String(order.customerId) === String(auth.userId)) return { auth, order }

  if (auth.role === 'RESTAURANT_OWNER') {
    const restaurant = await Restaurant.findById(order.restaurantId).select('ownerId').lean()
    if (restaurant && String(restaurant.ownerId) === String(auth.userId)) {
      return { auth, order }
    }
  }

  // Same error for "missing" and "not yours" so ids cannot be probed.
  throw forbidden()
}
