/**
 * Restaurant availability for customer listing / placeOrder.
 */

function ymdLocal(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isRestaurantPaused(restaurant, now = new Date()) {
  if (!restaurant) return true
  if (restaurant.isSuspended) return true
  if (restaurant.isAvailable === false) return true
  if (restaurant.pausedUntil) {
    const until = new Date(restaurant.pausedUntil)
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      return true
    }
  }
  return false
}

export function getHolidayException(restaurant, now = new Date()) {
  const key = ymdLocal(now)
  const list = restaurant?.holidayExceptions || []
  return list.find((h) => String(h.date) === key) || null
}

/** True when restaurant can accept new orders right now. */
export function canAcceptOrders(restaurant, now = new Date()) {
  if (!restaurant?.isActive) return false
  if (isRestaurantPaused(restaurant, now)) return false
  const holiday = getHolidayException(restaurant, now)
  if (holiday?.closed) return false
  return true
}

export function restaurantUnavailableReason(restaurant, now = new Date()) {
  if (!restaurant) return 'NOT_FOUND'
  if (restaurant.isSuspended) return 'SUSPENDED'
  if (!restaurant.isActive) return 'INACTIVE'
  if (restaurant.isAvailable === false) return 'PAUSED'
  if (restaurant.pausedUntil) {
    const until = new Date(restaurant.pausedUntil)
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      return 'PAUSED'
    }
  }
  const holiday = getHolidayException(restaurant, now)
  if (holiday?.closed) return 'HOLIDAY'
  return null
}
