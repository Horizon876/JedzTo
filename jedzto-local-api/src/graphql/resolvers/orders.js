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
import { id } from './helpers.js'

// ---------------------------------------------------------------------------
// Active order statuses
// ---------------------------------------------------------------------------

export const ACTIVE = new Set(['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'PREPARING'])
export const CANCELLED = new Set(['CANCELLED', 'REJECTED'])

// ---------------------------------------------------------------------------
// Order serialization (shared with Stripe route via named export)
// ---------------------------------------------------------------------------

export async function serializeOrder(order) {
  const restaurant = await Restaurant.findById(order.restaurantId).lean()
  const user = await User.findById(order.customerId).lean()
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
      addons: []
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

// ---------------------------------------------------------------------------
// Search / filter helpers
// ---------------------------------------------------------------------------

export const orderSearchFilter = async (search) => {
  if (!search) return {}
  const rx = { $regex: search, $options: 'i' }
  const [users, restaurants] = await Promise.all([
    User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .select('_id')
      .lean(),
    Restaurant.find({ name: rx }).select('_id').lean()
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
  const limit = Math.max(1, rows)
  const currentPage = Math.max(1, page)
  const totalCount = await Order.countDocuments(baseFilter)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const docs = await Order.find(baseFilter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .lean()

  return {
    orders: await Promise.all(docs.map(serializeOrder)),
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

export const assertCanReadRestaurantOrders = async (ctx, restaurantId) => {
  const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
  if (auth.role === 'SUPER_ADMIN') return auth
  const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean()
  if (!restaurant || String(restaurant.ownerId) !== String(auth.userId)) {
    throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
  }
  return auth
}
