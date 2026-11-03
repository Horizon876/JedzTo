import { Order } from '../models/Order.js'
import { Restaurant } from '../models/Restaurant.js'
import { Settlement } from '../models/Settlement.js'

/**
 * ISO week helpers (UTC, Monday–Sunday).
 * periodKey format: YYYY-Www (e.g. 2026-W45)
 * Legacy monthly keys YYYY-MM are still parsed for old settlement rows.
 */
function parseIsoWeek(periodKey) {
  const m = String(periodKey || '').match(/^(\d{4})-W(\d{1,2})$/i)
  if (!m) return null
  return { year: Number(m[1]), week: Number(m[2]) }
}

function mondayOfIsoWeek(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1)
  const monday = new Date(mondayWeek1)
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

function periodBounds(periodKey) {
  const iso = parseIsoWeek(periodKey)
  if (iso) {
    const periodStart = mondayOfIsoWeek(iso.year, iso.week)
    const periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 6)
    periodEnd.setUTCHours(23, 59, 59, 999)
    return { periodStart, periodEnd }
  }

  // Legacy monthly: YYYY-MM
  const [y, m] = String(periodKey).split('-').map(Number)
  const periodStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const periodEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return { periodStart, periodEnd }
}

export function currentPeriodKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNr = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNr + 3)
  const isoYear = d.getUTCFullYear()
  const week1 = mondayOfIsoWeek(isoYear, 1)
  const week =
    1 + Math.round((d.getTime() - week1.getTime() - 3 * 864e5) / (7 * 864e5))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

/** Recent week keys newest-first (current week first). */
export function recentPeriodKeys(count = 16, fromDate = new Date()) {
  const keys = []
  const d = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())
  )
  for (let i = 0; i < count; i++) {
    keys.push(currentPeriodKey(d))
    d.setUTCDate(d.getUTCDate() - 7)
  }
  return [...new Set(keys)]
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

/**
 * Aggregate delivered (or paid) orders for a restaurant in a settlement period.
 *
 * - Restaurant gross = order total minus COD cash fee (fee is platform-only).
 * - Commission = % of full order (products + delivery + tip/transport + cash fee).
 * - Cash fee is owed entirely to the platform.
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
    .select(
      'orderAmount paymentMethod paymentStatus platformCommission platformCommissionRate taxationAmount tipping deliveryCharges'
    )
    .lean()

  let onlineGross = 0
  let cashGross = 0
  let commissionOnOnline = 0
  let commissionOnCash = 0
  let cashFeeDue = 0

  for (const o of orders) {
    if (o.paymentStatus === 'REFUNDED') continue
    const amount = Number(o.orderAmount || 0)
    const cashFee = round2(Math.max(0, Number(o.taxationAmount || 0)))
    const restaurantAmount = round2(Math.max(0, amount - cashFee))
    const method = String(o.paymentMethod || 'COD').toUpperCase()
    const isCash = method === 'COD'
    const orderRate =
      o.platformCommissionRate != null ? Number(o.platformCommissionRate) : rate

    // Full order amount incl. COD cash fee (fee itself still goes to platform).
    const commission = round2((amount * orderRate) / 100)

    cashFeeDue += cashFee

    if (isCash) {
      cashGross += restaurantAmount
      commissionOnCash += commission
    } else {
      onlineGross += restaurantAmount
      commissionOnOnline += commission
    }
  }

  onlineGross = round2(onlineGross)
  cashGross = round2(cashGross)
  commissionOnOnline = round2(commissionOnOnline)
  commissionOnCash = round2(commissionOnCash)
  cashFeeDue = round2(cashFeeDue)
  const commissionDue = round2(commissionOnOnline + commissionOnCash)
  // Everything the restaurant owes from the cash side: commission + COD fee.
  const cashCommissionOwed = round2(commissionOnCash + cashFeeDue)
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
    cashFeeDue,
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
        cashFeeDue: totals.cashFeeDue,
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
