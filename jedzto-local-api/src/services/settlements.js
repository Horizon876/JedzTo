import { Order } from '../models/Order.js'
import { Restaurant } from '../models/Restaurant.js'
import { Settlement } from '../models/Settlement.js'

function periodBounds(periodKey) {
  // periodKey = YYYY-MM
  const [y, m] = String(periodKey).split('-').map(Number)
  const periodStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const periodEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return { periodStart, periodEnd }
}

export function currentPeriodKey(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

/**
 * Aggregate delivered (or paid) orders for a restaurant in a month.
 */
export async function computeSettlementTotals(restaurantId, periodKey) {
  const restaurant = await Restaurant.findById(restaurantId).lean()
  if (!restaurant) return null

  const { periodStart, periodEnd } = periodBounds(periodKey)
  const rate = Number(restaurant.commissionRate ?? 10)

  const orders = await Order.find({
    restaurantId,
    orderStatus: { $in: ['DELIVERED', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'PREPARING'] },
    createdAt: { $gte: periodStart, $lte: periodEnd },
    paymentStatus: { $nin: ['REFUNDED'] }
  })
    .select('orderAmount paymentMethod paymentStatus platformCommission')
    .lean()

  let onlineGross = 0
  let cashGross = 0
  let commissionOnOnline = 0
  let commissionOnCash = 0

  for (const o of orders) {
    if (o.paymentStatus === 'REFUNDED') continue
    const amount = Number(o.orderAmount || 0)
    const method = String(o.paymentMethod || 'COD').toUpperCase()
    const isCash = method === 'COD'
    const rateForOrder =
      o.platformCommission != null && amount > 0
        ? null
        : rate
    const commission =
      o.platformCommission != null
        ? Number(o.platformCommission)
        : round2((amount * (rateForOrder ?? rate)) / 100)

    if (isCash) {
      cashGross += amount
      commissionOnCash += commission
    } else {
      onlineGross += amount
      commissionOnOnline += commission
    }
  }

  onlineGross = round2(onlineGross)
  cashGross = round2(cashGross)
  commissionOnOnline = round2(commissionOnOnline)
  commissionOnCash = round2(commissionOnCash)
  const commissionDue = round2(commissionOnOnline + commissionOnCash)
  const cashCommissionOwed = commissionOnCash
  const onlinePayoutDue = round2(Math.max(0, onlineGross - commissionOnOnline))

  return {
    restaurantId: String(restaurantId),
    restaurantName: restaurant.name,
    periodKey,
    periodStart,
    periodEnd,
    onlineGross,
    cashGross,
    commissionRate: rate,
    commissionOnOnline,
    commissionOnCash,
    commissionDue,
    cashCommissionOwed,
    onlinePayoutDue,
    totalGross: round2(onlineGross + cashGross)
  }
}

export async function upsertSettlementPreview(restaurantId, periodKey) {
  const totals = await computeSettlementTotals(restaurantId, periodKey)
  if (!totals) return null

  const existing = await Settlement.findOne({ restaurantId, periodKey })
  if (existing?.status === 'SETTLED') {
    return {
      ...totals,
      _id: String(existing._id),
      status: 'SETTLED',
      settledAt: existing.settledAt
    }
  }

  const doc = await Settlement.findOneAndUpdate(
    { restaurantId, periodKey },
    {
      $set: {
        restaurantId,
        periodKey,
        periodStart: totals.periodStart,
        periodEnd: totals.periodEnd,
        onlineGross: totals.onlineGross,
        cashGross: totals.cashGross,
        commissionRate: totals.commissionRate,
        commissionOnOnline: totals.commissionOnOnline,
        commissionOnCash: totals.commissionOnCash,
        commissionDue: totals.commissionDue,
        cashCommissionOwed: totals.cashCommissionOwed,
        onlinePayoutDue: totals.onlinePayoutDue,
        status: existing?.status || 'OPEN'
      }
    },
    { upsert: true, new: true }
  )

  return {
    ...totals,
    _id: String(doc._id),
    status: doc.status,
    settledAt: doc.settledAt
  }
}

export async function listSettlementsForPeriod(periodKey) {
  const restaurants = await Restaurant.find({ isActive: true })
    .select('_id name commissionRate')
    .lean()
  const rows = []
  for (const r of restaurants) {
    const row = await upsertSettlementPreview(r._id, periodKey)
    if (row) rows.push(row)
  }
  return rows
}

export async function markSettlementSettled(restaurantId, periodKey, userId) {
  await upsertSettlementPreview(restaurantId, periodKey)
  const doc = await Settlement.findOneAndUpdate(
    { restaurantId, periodKey },
    {
      $set: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: userId || null
      }
    },
    { new: true }
  )
  if (!doc) return null
  return upsertSettlementPreview(restaurantId, periodKey)
}
