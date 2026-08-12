/**
 * Restaurant availability for customer listing / placeOrder.
 *
 * Business hours are always evaluated in Europe/Warsaw — never in the host
 * machine's local zone. On Render the process runs in UTC, so using
 * `new Date().getHours()` would hide open restaurants after Polish midnight
 * (or show them as open when they are already closed in Poland).
 */

const BUSINESS_TZ = 'Europe/Warsaw'
const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** Calendar parts for `date` as seen on the wall clock in Warsaw. */
function warsawParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  )
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    dayIndex: weekdayMap[parts.weekday] ?? date.getUTCDay(),
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  }
}

function ymdLocal(date = new Date()) {
  return warsawParts(date).ymd
}

function minutesNow(now = new Date()) {
  return warsawParts(now).minutes
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

function getWeeklyDay(restaurant, now = new Date()) {
  const key = DAY_KEYS[warsawParts(now).dayIndex]
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
