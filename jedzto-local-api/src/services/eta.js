import { Order } from '../models/Order.js'

/** Hardcoded ETA when kitchen flips the "busy" switch. */
export const BUSY_ETA_MINUTES = 90

/** How long a recent accepted order may drive the public ETA. */
export const RECENT_ORDER_WINDOW_MS = 60 * 60 * 1000

const clampEtaMinutes = (value, fallback = 45, { min = 5 } = {}) => {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(240, n))
}

/**
 * Resolve the restaurant's configured fallback ETA (Step 3).
 * Prefers explicit `defaultEta`; otherwise pickup + delivery travel times.
 */
export function resolveDefaultEta(restaurant) {
  if (restaurant?.defaultEta != null && Number.isFinite(Number(restaurant.defaultEta))) {
    return clampEtaMinutes(restaurant.defaultEta, 45)
  }
  const prep = Number(restaurant?.pickupTime)
  const travel = Number(restaurant?.deliveryTime)
  if (Number.isFinite(prep) || Number.isFinite(travel)) {
    const sum =
      (Number.isFinite(prep) ? prep : 0) + (Number.isFinite(travel) ? travel : 0)
    if (sum > 0) return Math.max(1, Math.min(240, Math.round(sum)))
  }
  return 45
}

/**
 * Public ETA on restaurant cards = kitchen timer (`defaultEta`).
 *
 * 1. isBusy → 90
 * 2. otherwise → defaultEta
 *
 * Accepting an order writes the chosen minutes into `defaultEta`
 * (see syncRestaurantTimesFromOrder), so the kitchen home timer and
 * the customer restaurant list stay in lockstep.
 *
 * @param {object} restaurant
 * @param {number|null|undefined} _latestAcceptedEtaMinutes unused (kept for call-site compat)
 */
export function computeCurrentEta(restaurant, _latestAcceptedEtaMinutes = null) {
  if (restaurant?.isBusy) return BUSY_ETA_MINUTES
  return resolveDefaultEta(restaurant)
}

/**
 * Latest accepted ETA for one restaurant within the recent window.
 */
export async function getLatestAcceptedEtaMinutes(
  restaurantId,
  nowMs = Date.now()
) {
  if (!restaurantId) return null
  const since = new Date(nowMs - RECENT_ORDER_WINDOW_MS)
  const order = await Order.findOne({
    restaurantId,
    acceptedAt: { $gte: since },
    acceptedEtaMinutes: { $ne: null }
  })
    .sort({ acceptedAt: -1 })
    .select('acceptedEtaMinutes')
    .lean()

  return order?.acceptedEtaMinutes == null
    ? null
    : Number(order.acceptedEtaMinutes)
}

/**
 * Batch lookup: restaurantId → latest acceptedEtaMinutes (last 60 minutes).
 */
export async function getLatestAcceptedEtaByRestaurantIds(
  restaurantIds,
  nowMs = Date.now()
) {
  const ids = (restaurantIds || []).filter(Boolean)
  const map = new Map()
  if (!ids.length) return map

  const since = new Date(nowMs - RECENT_ORDER_WINDOW_MS)
  const rows = await Order.aggregate([
    {
      $match: {
        restaurantId: { $in: ids },
        acceptedAt: { $gte: since },
        acceptedEtaMinutes: { $ne: null }
      }
    },
    { $sort: { acceptedAt: -1 } },
    {
      $group: {
        _id: '$restaurantId',
        acceptedEtaMinutes: { $first: '$acceptedEtaMinutes' }
      }
    }
  ])

  for (const row of rows) {
    map.set(String(row._id), Number(row.acceptedEtaMinutes))
  }
  return map
}

/**
 * Attach `currentEta` (and normalized defaultEta / isBusy) onto restaurant docs.
 */
export async function withCurrentEtas(restaurants) {
  const list = Array.isArray(restaurants) ? restaurants : []
  if (!list.length) return list

  return list.map((restaurant) => {
    const defaultEta = resolveDefaultEta(restaurant)
    const isBusy = Boolean(restaurant.isBusy)
    const currentEta = computeCurrentEta({ ...restaurant, defaultEta, isBusy })
    return {
      ...restaurant,
      defaultEta,
      isBusy,
      currentEta
    }
  })
}

/**
 * Single-restaurant helper used by restaurant(id) detail queries.
 */
export async function withCurrentEta(restaurant) {
  if (!restaurant) return restaurant
  const [enriched] = await withCurrentEtas([restaurant])
  return enriched
}
