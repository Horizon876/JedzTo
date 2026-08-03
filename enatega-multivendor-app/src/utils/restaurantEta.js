/**
 * Minutes shown on restaurant cards / detail before an order is placed.
 * Always a single total — never a prep + travel breakdown in the UI.
 */
export function getRestaurantEtaMinutes(restaurant, { isPickup = false } = {}) {
  if (!restaurant) return null

  if (restaurant.currentEta != null) {
    const current = Number(restaurant.currentEta)
    if (Number.isFinite(current) && current > 0) return current
  }

  if (restaurant.defaultEta != null) {
    const fallback = Number(restaurant.defaultEta)
    if (Number.isFinite(fallback) && fallback > 0) return fallback
  }

  const prep = Number(restaurant.pickupTime ?? 0)
  const travel = Number(restaurant.deliveryTime ?? 0)

  if (isPickup) {
    const pickup = prep > 0 ? prep : travel
    return Number.isFinite(pickup) && pickup > 0 ? pickup : null
  }

  // Prefer pickupTime when deliveryTime is 0 (single-total storage).
  if (prep > 0 && travel === 0) return prep
  const sum = prep + travel
  if (sum > 0) return sum
  if (travel > 0) return travel
  return null
}
