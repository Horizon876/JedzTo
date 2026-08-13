/**
 * services/pricing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative order pricing.
 *
 * The client used to dictate `deliveryCharges`, `taxationAmount` and `tipping`,
 * and prices for unknown addon options silently fell back to 0. A crafted
 * mutation could therefore place a real order for a fraction of its value (or
 * even a negative total). Everything money-related is recomputed here from the
 * restaurant's own data; the client's numbers are only used as a cross-check.
 */

import { GraphQLError } from 'graphql'
import { Food, Coupon, CouponRedemption } from '../models/index.js'
import {
  DELIVERY_RATE,
  COD_CASH_FEE,
  MAX_ITEM_QUANTITY
} from '../config.js'
import { resolveDelivery } from '../graphql/resolvers/helpers.js'
import { normalizePhone } from '../utils/phone.js'

const badInput = (message, code = 'BAD_USER_INPUT') =>
  new GraphQLError(message, { extensions: { code } })

const round2 = (value) => Math.round(value * 100) / 100

const toQuantity = (value) => {
  const n = Math.floor(Number(value ?? 1))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, MAX_ITEM_QUANTITY)
}

/**
 * Resolves the ordered lines against the restaurant's own menu.
 *
 * @returns {Promise<{ items: object[], itemsTotal: number }>}
 */
export async function buildOrderItems(restaurant, orderInput) {
  const lines = Array.isArray(orderInput) ? orderInput : []
  if (!lines.length) throw badInput('Koszyk jest pusty')

  // One query for every line instead of one query per line (N+1).
  // Scoped by restaurantId so a food id from another store cannot be injected.
  const foodIds = [...new Set(lines.map((line) => String(line.food || '')))]
  const foods = await Food.find({
    _id: { $in: foodIds },
    restaurantId: restaurant._id
  }).lean()
  const foodById = new Map(foods.map((food) => [String(food._id), food]))

  const optionById = new Map(
    (restaurant.options || []).map((option) => [String(option._id), option])
  )
  const addonById = new Map(
    (restaurant.addons || []).map((addon) => [String(addon._id), addon])
  )

  const items = []
  let itemsTotal = 0

  for (const line of lines) {
    const food = foodById.get(String(line.food))
    if (!food) throw badInput('Pozycja nie należy do tej restauracji lub nie istnieje')
    if (food.isActive === false || food.isOutOfStock) {
      throw badInput(`"${food.title}" jest chwilowo niedostępne`)
    }

    const variations = food.variations || []
    const variation = line.variation
      ? variations.find((v) => String(v._id) === String(line.variation))
      : variations[0]
    if (!variation) throw badInput(`Nieprawidłowy wariant pozycji "${food.title}"`)
    if (variation.isOutOfStock) {
      throw badInput(`Wybrany wariant "${food.title}" jest niedostępny`)
    }

    // Prices always come from the database, never from the request.
    const unitPrice = Number(variation.discounted > 0 ? variation.discounted : variation.price)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw badInput(`Nieprawidłowa cena pozycji "${food.title}"`)
    }

    const addons = (line.addons || []).map((selected) => {
      const meta = addonById.get(String(selected._id))
      if (!meta) throw badInput('Nieznany dodatek w zamówieniu')

      const options = (selected.options || []).map((optionId) => {
        const option = optionById.get(String(optionId))
        // Previously an unknown id was accepted at price 0 — a free upgrade.
        if (!option) throw badInput('Nieznana opcja dodatku w zamówieniu')
        return {
          _id: String(option._id),
          title: option.title || '',
          description: option.description || '',
          price: Number(option.price || 0)
        }
      })

      const min = Number(meta.quantityMinimum ?? 0)
      const max = Number(meta.quantityMaximum ?? 1)
      if (options.length < min || (max > 0 && options.length > max)) {
        throw badInput(`Nieprawidłowa liczba opcji dla dodatku "${meta.title || ''}"`)
      }

      return {
        _id: String(meta._id),
        title: meta.title || 'Dodatek',
        description: meta.description || '',
        quantityMinimum: min,
        quantityMaximum: max,
        options
      }
    })

    const addonExtra = addons.reduce(
      (sum, addon) => sum + addon.options.reduce((s, o) => s + o.price, 0),
      0
    )
    const quantity = toQuantity(line.quantity)
    itemsTotal += (unitPrice + addonExtra) * quantity

    items.push({
      food: food._id,
      title: food.title,
      description: food.description || '',
      image: food.image || null,
      quantity,
      variation: {
        _id: variation._id,
        title: variation.title,
        price: unitPrice,
        discounted: variation.discounted || 0
      },
      addons,
      specialInstructions: String(line.specialInstructions || '').slice(0, 500),
      excludedIngredients: (line.excludedIngredients || []).slice(0, 30).map(String)
    })
  }

  return { items, itemsTotal: round2(itemsTotal) }
}

/** Delivery fee straight from the restaurant's delivery areas. */
export function resolveDeliveryFee(restaurant, { isPickup, latitude, longitude }) {
  if (isPickup) return 0

  const delivery = resolveDelivery(restaurant, latitude, longitude)
  if (!delivery.available) {
    throw badInput('Ten adres jest poza obszarem dostawy', 'OUT_OF_DELIVERY_AREA')
  }
  // `fee === null` means the restaurant has no areas configured yet, so the
  // platform's flat rate applies (mirrors the client-side fallback).
  return delivery.fee == null ? DELIVERY_RATE : Number(delivery.fee)
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Looks up an enabled coupon for a restaurant (case-insensitive title).
 * Platform-wide coupons have restaurantId = null.
 * When `phone` is set, rejects codes already redeemed by that number.
 */
export async function lookupCoupon(restaurantId, couponCode, { phone, itemsTotal } = {}) {
  const code = String(couponCode || '').trim()
  if (!code) {
    return { ok: false, message: 'Podaj kod kuponu', coupon: null }
  }

  const restaurantOid = restaurantId || null
  const coupon = await Coupon.findOne({
    title: { $regex: new RegExp(`^${escapeRegex(code)}$`, 'i') },
    enabled: true,
    $or: [{ restaurantId: restaurantOid }, { restaurantId: null }]
  })

  if (!coupon) {
    return { ok: false, message: 'Nieprawidłowy kupon', coupon: null }
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: 'Kod rabatowy został już wykorzystany', coupon: null }
  }

  const phoneKey = normalizePhone(phone)
  if (phoneKey) {
    const used = await CouponRedemption.findOne({
      couponId: coupon._id,
      phone: phoneKey
    }).lean()
    if (used) {
      return {
        ok: false,
        message: 'Ten numer telefonu już wykorzystał ten kod rabatowy',
        coupon: null
      }
    }
  }

  const minOrder = Number(coupon.minOrderValue || 0)
  if (
    itemsTotal != null &&
    Number.isFinite(Number(itemsTotal)) &&
    minOrder > 0 &&
    Number(itemsTotal) < minOrder
  ) {
    return {
      ok: false,
      message: `Kod rabatowy wymaga zamówienia od ${minOrder.toFixed(2)} zł`,
      coupon: null
    }
  }

  return { ok: true, message: 'Zastosowano kupon', coupon }
}

function computeDiscountAmount(coupon, itemsTotal) {
  const type = coupon.discountType === 'fixed' ? 'fixed' : 'percent'
  if (type === 'fixed') {
    const amount = Math.max(0, Number(coupon.discount || 0))
    return round2(Math.min(itemsTotal, amount))
  }
  const percent = Math.min(100, Math.max(0, Number(coupon.discount || 0)))
  return round2((itemsTotal * percent) / 100)
}

/** Validates a coupon and returns the discount in currency units. */
async function resolveDiscount(restaurant, couponCode, itemsTotal, { phone } = {}) {
  if (!couponCode) return { discountAmount: 0, coupon: null }

  const phoneKey = normalizePhone(phone)
  if (!phoneKey) {
    throw badInput('Aby użyć kuponu, zweryfikuj numer telefonu')
  }

  const { ok, message, coupon } = await lookupCoupon(restaurant._id, couponCode, {
    phone: phoneKey
  })
  if (!ok || !coupon) throw badInput(message || 'Kod rabatowy jest nieprawidłowy lub nieaktywny')
  if (itemsTotal < Number(coupon.minOrderValue || 0)) {
    throw badInput(
      `Kod rabatowy wymaga zamówienia od ${Number(coupon.minOrderValue).toFixed(2)} zł`
    )
  }

  return { discountAmount: computeDiscountAmount(coupon, itemsTotal), coupon }
}

/**
 * Computes every monetary field of an order.
 *
 * @param {object} restaurant
 * @param {object} args placeOrder arguments (client input)
 * @param {{ phone?: string }} [opts]
 */
export async function priceOrder(restaurant, args, opts = {}) {
  const isPickup = Boolean(args.isPickedUp)
  const { items, itemsTotal } = await buildOrderItems(restaurant, args.orderInput)

  const latitude = Number(args.address?.latitude)
  const longitude = Number(args.address?.longitude)
  const deliveryCharges = resolveDeliveryFee(restaurant, {
    isPickup,
    latitude,
    longitude
  })

  const { discountAmount, coupon } = await resolveDiscount(
    restaurant,
    args.couponCode,
    itemsTotal,
    { phone: opts.phone }
  )

  // Cash handling surcharge is a platform rule, not a client-supplied number.
  const paymentMethod = String(args.paymentMethod || 'COD').toUpperCase()
  const taxationAmount = paymentMethod === 'COD' ? COD_CASH_FEE : 0

  // A tip is voluntary but must be a sane, non-negative amount.
  const requestedTip = Number(args.tipping || 0)
  const tipping =
    isPickup || !Number.isFinite(requestedTip) || requestedTip <= 0
      ? 0
      : round2(Math.min(requestedTip, Math.max(50, itemsTotal)))

  const goodsTotal = round2(itemsTotal - discountAmount)
  // Prefer the matched delivery zone's minOrder (same source as delivery fee).
  const delivery = isPickup
    ? null
    : resolveDelivery(restaurant, latitude, longitude)
  const minimumOrder = Number(
    delivery?.minOrder != null ? delivery.minOrder : restaurant.minimumOrder || 0
  )
  if (!isPickup && minimumOrder > 0 && goodsTotal < minimumOrder) {
    const remaining = round2(minimumOrder - goodsTotal)
    throw badInput(
      `Minimalna wartość zamówienia to ${minimumOrder.toFixed(2)} zł. Dodaj jeszcze coś za ${remaining.toFixed(2)} zł`
    )
  }

  const orderAmount = round2(goodsTotal + deliveryCharges + taxationAmount + tipping)
  if (orderAmount <= 0) throw badInput('Nieprawidłowa kwota zamówienia')

  const commissionRate = Number(restaurant.commissionRate ?? 10)

  return {
    items,
    itemsTotal,
    discountAmount,
    deliveryCharges,
    taxationAmount,
    tipping,
    orderAmount,
    paymentMethod,
    isPickup,
    commissionRate,
    platformCommission: round2((orderAmount * commissionRate) / 100),
    coupon
  }
}
