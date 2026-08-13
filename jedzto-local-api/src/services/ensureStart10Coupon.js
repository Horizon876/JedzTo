/**
 * Ensures the launch promo coupon exists in production.
 * START10: −10 zł on orders from 75 zł, 500 uses, all restaurants.
 */

import { Coupon } from '../models/index.js'

const START10 = {
  title: 'START10',
  discount: 10,
  discountType: 'fixed',
  enabled: true,
  restaurantId: null,
  minOrderValue: 75,
  usageLimit: 500
}

export async function ensureStart10Coupon() {
  const existing = await Coupon.findOne({
    title: { $regex: /^START10$/i }
  })

  if (!existing) {
    await Coupon.create({ ...START10, usedCount: 0 })
    return
  }

  let changed = false
  if (existing.discountType !== 'fixed') {
    existing.discountType = 'fixed'
    changed = true
  }
  if (Number(existing.discount) !== 10) {
    existing.discount = 10
    changed = true
  }
  if (Number(existing.minOrderValue) !== 75) {
    existing.minOrderValue = 75
    changed = true
  }
  if (Number(existing.usageLimit) !== 500) {
    existing.usageLimit = 500
    changed = true
  }
  if (existing.restaurantId != null) {
    existing.restaurantId = null
    changed = true
  }
  if (!existing.enabled) {
    existing.enabled = true
    changed = true
  }
  if (changed) await existing.save()
}
