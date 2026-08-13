/**
 * One-shot data fixes for production delivery zones.
 * Rudnik (~2.8 km west of Pizzeria Italiana) must sit in Strefa 1 (min 45 zł),
 * not only in the neighbouring Strefa 2 (min 65 zł).
 */

import { Restaurant } from '../models/index.js'

const ITALIANA_ID = '6a7c8fff9dae5d65f04aeaf6'
/** Radius that covers Rudnik from the restaurant pin (~2.84 km). */
const STREFA1_RADIUS_KM = 4.5

export async function ensureItalianaDeliveryAreas() {
  const restaurant = await Restaurant.findById(ITALIANA_ID)
  if (!restaurant?.deliveryAreas?.length) return

  let changed = false
  const areas = restaurant.deliveryAreas.map((area) => {
    const name = String(area.name || '')
    const next = area.toObject ? area.toObject() : { ...area }

    if (/strefa\s*1/i.test(name) && Number(next.radiusKm) < STREFA1_RADIUS_KM) {
      next.radiusKm = STREFA1_RADIUS_KM
      if (next.minOrder == null || Number(next.minOrder) === 0) next.minOrder = 45
      changed = true
    }

    // Pull Strefa 2 west so its tight circle is Sułkowice-east, not Rudnik.
    if (/strefa\s*2/i.test(name)) {
      const lng = Number(next.longitude)
      if (Number.isFinite(lng) && lng > 19.83) {
        next.longitude = 19.825
        next.latitude = 49.848
        next.radiusKm = Math.min(Number(next.radiusKm) || 2.4, 2.2)
        changed = true
      }
    }

    return next
  })

  if (!changed) return

  restaurant.deliveryAreas = areas
  if (restaurant.minimumOrder == null || Number(restaurant.minimumOrder) < 45) {
    restaurant.minimumOrder = 45
  }
  await restaurant.save()
  console.log('[delivery] Pizzeria Italiana: Strefa 1 extended to cover Rudnik (min 45 zł)')
}
