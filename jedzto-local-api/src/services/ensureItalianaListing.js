/**
 * Keep Pizzeria Italiana orderable on the customer list.
 * Accidental pause (isAvailable=false) or an empty Monday schedule hides it
 * entirely from nearByRestaurants / restaurants.
 */

import { Restaurant } from '../models/index.js'

const ITALIANA_ID = '6a7c8fff9dae5d65f04aeaf6'
const DEFAULT_WEEKDAY_SLOT = { startTime: ['11', '00'], endTime: ['21', '30'] }

export async function ensureItalianaListing() {
  const restaurant = await Restaurant.findById(ITALIANA_ID)
  if (!restaurant) return

  let changed = false

  if (restaurant.isAvailable === false) {
    restaurant.isAvailable = true
    changed = true
  }
  if (restaurant.pausedUntil) {
    restaurant.pausedUntil = null
    changed = true
  }
  if (restaurant.isBusy) {
    restaurant.isBusy = false
    changed = true
  }

  const opening = (restaurant.openingTimes || []).map((d) =>
    d.toObject ? d.toObject() : { ...d }
  )
  const byDay = new Map(
    opening.map((d) => [String(d.day || '').toUpperCase(), { ...d, day: String(d.day || '').toUpperCase() }])
  )

  const tueSlots = Array.isArray(byDay.get('TUE')?.times) ? byDay.get('TUE').times : []
  const monSlots = Array.isArray(byDay.get('MON')?.times) ? byDay.get('MON').times : []
  if (!monSlots.length) {
    const slots = tueSlots.length
      ? tueSlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime }))
      : [{ ...DEFAULT_WEEKDAY_SLOT }]
    byDay.set('MON', { day: 'MON', times: slots })
    changed = true
  }

  if (!changed) return

  const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  restaurant.openingTimes = order
    .filter((day) => byDay.has(day))
    .map((day) => byDay.get(day))
  await restaurant.save()
  console.log('[listing] Pizzeria Italiana: unpaused + Monday hours restored')
}
