/**
 * Restaurant availability for customer listing / placeOrder.
 */

function ymdLocal(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function minutesNow(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes()
}

/** Parse "HH:MM" or ["HH","MM"] into minutes from midnight. */
function parseHm(value) {
  if (value == null) return null
  if (Array.isArray(value) && value.length >= 2) {
    const h = Number(value[0])
    const m = Number(value[1])
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    return h * 60 + m
  }
  const raw = String(value).trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function isWithinWindow(nowMinutes, open, close) {
  const start = parseHm(open)
  const end = parseHm(close)
  if (start == null || end == null) return true
  if (end > start) return nowMinutes >= start && nowMinutes < end
  // Overnight window, e.g. 22:00–02:00
  return nowMinutes >= start || nowMinutes < end
}

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getWeeklyDay(restaurant, now = new Date()) {
  const key = DAY_KEYS[now.getDay()]
  const list = restaurant?.openingTimes || []
  return (
    list.find((d) => String(d.day || '').toUpperCase() === key) ||
    list.find((d) => String(d.day || '').toUpperCase().startsWith(key.slice(0, 3))) ||
    null
  )
}

export function isRestaurantPaused(restaurant, now = new Date()) {
  if (!restaurant) return true
  if (restaurant.isSuspended) return true
  if (restaurant.isAvailable === false) return true
  if (restaurant.isBusy) return true
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

function isOpenByWeeklySchedule(restaurant, now = new Date()) {
  const day = getWeeklyDay(restaurant, now)
  // No schedule configured → don't block (legacy restaurants).
  if (!day) return true
  const slots = day.times || []
  if (!slots.length) return false
  const nowMinutes = minutesNow(now)
  return slots.some((slot) => isWithinWindow(nowMinutes, slot.startTime, slot.endTime))
}

/** True when restaurant can accept new orders right now. */
export function canAcceptOrders(restaurant, now = new Date()) {
  if (!restaurant?.isActive) return false
  if (isRestaurantPaused(restaurant, now)) return false

  const holiday = getHolidayException(restaurant, now)
  if (holiday) {
    if (holiday.closed) return false
    // Custom holiday hours for this date.
    if (holiday.open || holiday.close) {
      return isWithinWindow(minutesNow(now), holiday.open, holiday.close)
    }
    // Explicit open all day on holiday exception.
    return true
  }

  return isOpenByWeeklySchedule(restaurant, now)
}

export function restaurantUnavailableReason(restaurant, now = new Date()) {
  if (!restaurant) return 'NOT_FOUND'
  if (restaurant.isSuspended) return 'SUSPENDED'
  if (!restaurant.isActive) return 'INACTIVE'
  if (restaurant.isAvailable === false) return 'PAUSED'
  if (restaurant.isBusy) return 'BUSY'
  if (restaurant.pausedUntil) {
    const until = new Date(restaurant.pausedUntil)
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      return 'PAUSED'
    }
  }

  const holiday = getHolidayException(restaurant, now)
  if (holiday) {
    if (holiday.closed) return 'HOLIDAY'
    if (
      (holiday.open || holiday.close) &&
      !isWithinWindow(minutesNow(now), holiday.open, holiday.close)
    ) {
      return 'CLOSED'
    }
    return null
  }

  if (!isOpenByWeeklySchedule(restaurant, now)) return 'CLOSED'
  return null
}
