/**
 * Round a Date up to the next full 10 minutes (local time).
 * 19:34 → 19:40; already on :00/:10/:20… stays as-is.
 */
export function roundUpToTenMinutes(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  d.setSeconds(0, 0)
  const mins = d.getMinutes()
  const rem = mins % 10
  if (rem === 0) return d
  d.setMinutes(mins + (10 - rem))
  return d
}

/** Format as HH:mm (24h, local). */
export function formatClockTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Absolute ETA moment for an active order (before rounding).
 * Prefers server expectedTime / deliveryExpectedTime; falls back to
 * acceptedAt/createdAt + accepted ETA minutes.
 */
export function getOrderEtaDate(order, { outForDelivery = false } = {}) {
  if (!order) return null

  const iso = outForDelivery
    ? order.deliveryExpectedTime || order.expectedTime
    : order.expectedTime

  if (iso) {
    const fromIso = new Date(iso)
    if (!Number.isNaN(fromIso.getTime())) return fromIso
  }

  const mins =
    Number(order.acceptedEtaMinutes) > 0
      ? Number(order.acceptedEtaMinutes)
      : Number(order.preparationEtaMinutes ?? 0) +
        (order.isPickedUp ? 0 : Number(order.deliveryEtaMinutes ?? 0))

  if (!(mins > 0)) return null

  const baseIso = order.acceptedAt || order.createdAt
  const base = baseIso ? new Date(baseIso) : new Date()
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + mins * 60 * 1000)
}

/**
 * Clock time shown on an order: ETA rounded up to the next full 10 minutes.
 * Example: ordered 19:04, +30 min → 19:34 → "19:40"
 */
export function getOrderEtaClockLabel(order, options = {}) {
  const eta = getOrderEtaDate(order, options)
  if (!eta) return null
  const rounded = roundUpToTenMinutes(eta)
  return rounded ? formatClockTime(rounded) : null
}
