/**
 * resolvers/admin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin and restaurant-owner mutations: order status updates, ETA management,
 * restaurant CRUD, shop type CRUD, delivery areas and settlements.
 */

import { GraphQLError } from 'graphql'
import Stripe from 'stripe'
import {
  User,
  Restaurant,
  Category,
  Food,
  Order,
  ShopType,
  Coupon,
  CouponRedemption,
  TasteCategory
} from '../../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  requireRestaurantOwner
} from '../../auth/jwt.js'
import { STRIPE_SECRET_KEY, MIN_PASSWORD_LENGTH } from '../../config.js'
import { toMoney } from '../../utils/sanitize.js'
import { normalizePhone } from '../../utils/phone.js'
import { resolveDefaultEta } from '../../services/eta.js'
import { markSettlementSettled, currentPeriodKey } from '../../services/settlements.js'
import { publishOrderChanged, isOnlineCardMethod } from '../../services/orderNotify.js'
import { isStorePoolRestaurant } from '../../services/storePool.js'
import { priceOrder, lookupCoupon } from '../../services/pricing.js'
import { withCurrentEta } from '../../services/eta.js'
import { restaurantUnavailableReason } from '../../services/restaurantAvailability.js'
import {
  pubsub,
  ORDER_STATUS,
  ORDER_CHANGED,
  CHAT_MESSAGE,
  RESTAURANT_UPDATED
} from '../orderPubsub.js'
import {
  id,
  clampEtaMinutes,
  slugify,
  normalizeAreaName,
  applyOrderEtaFields,
  couponShape,
  adminUserShape,
  toLatitude,
  toLongitude
} from './helpers.js'
import {
  buildRestaurantTree,
  buildRestaurantTreeById,
  publishRestaurantTimes,
  RestaurantFieldResolvers
} from './restaurant.js'
import {
  serializeOrder,
  ACTIVE,
  loadAuthorizedOrder,
  assertCanManageRestaurantOrder
} from './orders.js'
import { cleanPolishAddress } from '../../utils/polishAddress.js'

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

const badInput = (message) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } })

const forbidden = (message = 'FORBIDDEN') =>
  new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } })

/**
 * A restaurant owner may manage coupons for their own restaurant only;
 * platform-wide coupons (restaurantId = null) are a super-admin concern.
 */
const resolveCouponScope = (couponInput, auth) => {
  const requested =
    couponInput.restaurantId === 'all' || !couponInput.restaurantId
      ? null
      : String(couponInput.restaurantId)

  if (auth.role === 'SUPER_ADMIN') return requested
  if (!requested || requested !== String(auth.restaurantId || '')) {
    throw forbidden('FORBIDDEN: not your restaurant')
  }
  return requested
}

/** Percent discounts are 1–100; fixed discounts are a PLN amount > 0. */
const assertCouponInput = (couponInput) => {
  const discount = Number(couponInput.discount)
  const discountType = couponInput.discountType === 'fixed' ? 'fixed' : 'percent'
  if (!Number.isFinite(discount) || discount <= 0) {
    throw badInput('Rabat musi być liczbą większą od zera')
  }
  if (discountType === 'percent' && discount > 100) {
    throw badInput('Rabat procentowy musi być w zakresie 1–100%')
  }
  if (discountType === 'fixed' && discount > 500) {
    throw badInput('Rabat kwotowy nie może przekraczać 500 zł')
  }
  if (!String(couponInput.title || '').trim()) {
    throw badInput('Kod rabatowy wymaga nazwy')
  }
}

// ---------------------------------------------------------------------------
// ETA sync helper: last accepted ETA becomes restaurant default
// ---------------------------------------------------------------------------

async function syncRestaurantTimesFromOrder(order) {
  const restaurant = await Restaurant.findById(order.restaurantId)
  if (!restaurant) return null

  const total =
    order.acceptedEtaMinutes != null
      ? clampEtaMinutes(order.acceptedEtaMinutes)
      : clampEtaMinutes(
          Number(order.preparationEtaMinutes ?? 0) +
            (order.isPickedUp ? 0 : Number(order.deliveryEtaMinutes ?? 0))
        )

  restaurant.defaultEta = total
  restaurant.pickupTime = total
  restaurant.deliveryTime = 0
  await restaurant.save()
  publishRestaurantTimes(restaurant)
  return restaurant
}

// ---------------------------------------------------------------------------
// Admin Mutations
// ---------------------------------------------------------------------------

export const adminMutations = {
  // Ownership is enforced by loadAuthorizedOrder: previously *any* logged-in
  // user could cancel *any* order just by knowing its id.
  abortOrder: async (_p, { id: orderId }, ctx) => {
    assertPublicAccess(ctx)
    const { order } = await loadAuthorizedOrder(ctx, orderId)
    if (!ACTIVE.has(order.orderStatus)) {
      throw badInput('Zamówienia nie można już anulować')
    }
    order.orderStatus = 'CANCELLED'
    order.cancelledAt = new Date()
    order.isRinged = false
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'abortOrder')
    return serialized
  },

  /** Customer checkout — validate code; requires a verified phone on the account. */
  coupon: async (_p, { coupon, restaurantId, phone, itemsTotal }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const customer = await User.findById(auth.userId).select('phone phoneIsVerified').lean()
    const phoneKey = normalizePhone(phone) || normalizePhone(customer?.phone)
    if (!phoneKey || !customer?.phoneIsVerified) {
      return {
        success: false,
        message: 'Aby użyć kuponu, zweryfikuj numer telefonu',
        coupon: null
      }
    }
    // Ignore a client-supplied number that does not match the verified account phone.
    if (normalizePhone(customer.phone) && normalizePhone(customer.phone) !== phoneKey) {
      return {
        success: false,
        message: 'Aby użyć kuponu, zweryfikuj numer telefonu',
        coupon: null
      }
    }
    const result = await lookupCoupon(restaurantId, coupon, {
      phone: phoneKey,
      itemsTotal
    })
    return {
      success: result.ok,
      message: result.message,
      coupon: result.coupon ? couponShape(result.coupon) : null
    }
  },
  // Legacy alias (capital C).
  Coupon: async (_p, args, ctx) => adminMutations.coupon(_p, args, ctx),

  createCoupon: async (_p, { couponInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    assertCouponInput(couponInput)
    const doc = await Coupon.create({
      title: String(couponInput.title).trim(),
      discount: Number(couponInput.discount),
      discountType: couponInput.discountType === 'fixed' ? 'fixed' : 'percent',
      enabled: couponInput.enabled !== false,
      restaurantId: resolveCouponScope(couponInput, auth),
      minOrderValue: toMoney(couponInput.minOrderValue),
      usageLimit: couponInput.usageLimit ?? null
    })
    return couponShape(doc)
  },

  editCoupon: async (_p, { couponInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    assertCouponInput(couponInput)

    const existing = await Coupon.findById(couponInput._id)
    if (!existing) throw badInput('Coupon not found')
    // Check the coupon's *current* owner as well as the requested one, so an
    // owner cannot hijack a platform-wide or foreign coupon.
    if (
      auth.role !== 'SUPER_ADMIN' &&
      String(existing.restaurantId || '') !== String(auth.restaurantId || '')
    ) {
      throw forbidden('FORBIDDEN: not your coupon')
    }

    existing.title = String(couponInput.title).trim()
    existing.discount = Number(couponInput.discount)
    existing.discountType = couponInput.discountType === 'fixed' ? 'fixed' : 'percent'
    existing.enabled = couponInput.enabled !== false
    existing.restaurantId = resolveCouponScope(couponInput, auth)
    existing.minOrderValue = toMoney(couponInput.minOrderValue)
    existing.usageLimit = couponInput.usageLimit ?? null
    await existing.save()
    return couponShape(existing)
  },

  deleteCoupon: async (_p, { id: couponId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const scope =
      auth.role === 'SUPER_ADMIN'
        ? { _id: couponId }
        : { _id: couponId, restaurantId: auth.restaurantId || null }
    const result = await Coupon.deleteOne(scope)
    return result.deletedCount > 0
  },

  sendChatMessage: async (_p, { orderId, messageInput }, ctx) => {
    assertPublicAccess(ctx)
    // Only the order's customer, its restaurant or an admin may post to the
    // order's chat channel.
    const { auth, order } = await loadAuthorizedOrder(ctx, orderId, { lean: true })
    const user = await User.findById(auth.userId).select('name').lean()
    const data = {
      id: String(Date.now()),
      message: String(messageInput.message || '').slice(0, 2000),
      image: messageInput.image || null,
      user: { id: String(auth.userId), name: user?.name || '' },
      createdAt: new Date().toISOString()
    }
    pubsub.publish(CHAT_MESSAGE, {
      subscriptionNewMessage: data,
      orderId: String(order._id)
    })
    return { success: true, message: 'ok', data }
  },

  reviewOrder: async (_p, { order: orderId, rating, description }, ctx) => {
    assertPublicAccess(ctx)
    const { auth, order } = await loadAuthorizedOrder(ctx, orderId)
    // A review is the customer's voice — the restaurant must not write it.
    if (String(order.customerId) !== String(auth.userId)) {
      throw forbidden('Tylko zamawiający może ocenić zamówienie')
    }
    if (order.orderStatus !== 'DELIVERED') {
      throw badInput('Ocenić można tylko dostarczone zamówienie')
    }
    const score = Math.round(Number(rating))
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw badInput('Ocena musi być liczbą z zakresu 1–5')
    }

    order.review = {
      _id: String(order._id),
      rating: score,
      description: String(description || '').slice(0, 1000),
      createdAt: new Date().toISOString()
    }
    await order.save()
    return serializeOrder(order.toObject())
  },

  updateOrderStatus: async (_p, { orderId, status }, ctx) => {
    assertPublicAccess(ctx)
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    await assertCanManageRestaurantOrder(ctx, order)
    order.orderStatus = status
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'updateOrderStatus')
    return serialized
  },

  updateStatus: async (
    _p,
    { id: orderId, orderStatus: requestedStatus, preparationEtaMinutes, deliveryEtaMinutes },
    ctx
  ) => {
    assertPublicAccess(ctx)
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    await assertCanManageRestaurantOrder(ctx, order)

    let orderStatus = String(requestedStatus || '')
    const restaurant = await Restaurant.findById(order.restaurantId)
      .select('shopType cuisines tags name defaultEta pickupTime deliveryTime isBusy')
      .lean()
    const isStorePool = isStorePoolRestaurant(restaurant)

    // Store/grocery delivery: confirm opens the rider pool instead of
    // showing ACCEPTED to the customer. Pickup still goes straight to ACCEPTED.
    if (
      isStorePool &&
      !order.isPickedUp &&
      order.orderStatus === 'PENDING' &&
      (orderStatus === 'ACCEPTED' || orderStatus === 'SEEKING_RIDER')
    ) {
      orderStatus = 'SEEKING_RIDER'
    }

    order.orderStatus = orderStatus
    const now = new Date()
    if (orderStatus === 'SEEKING_RIDER') {
      order.isRinged = false
      // Keep ETA hint for when a rider later accepts, but do not stamp acceptedAt.
      if (preparationEtaMinutes != null || deliveryEtaMinutes != null) {
        const { total } = applyOrderEtaFields(
          order,
          { preparationEtaMinutes, deliveryEtaMinutes },
          now.getTime()
        )
        order.acceptedEtaMinutes = total
      } else if (order.acceptedEtaMinutes == null) {
        const fallback = resolveDefaultEta(restaurant)
        const { total } = applyOrderEtaFields(
          order,
          { preparationEtaMinutes: fallback, deliveryEtaMinutes: 0 },
          now.getTime()
        )
        order.acceptedEtaMinutes = total
      }
    }
    if (orderStatus === 'ACCEPTED') {
      order.acceptedAt = now
      order.isRinged = false
      order.isRiderRinged = false
    }
    if (orderStatus === 'ASSIGNED') order.assignedAt = now
    if (orderStatus === 'PICKED') order.pickedAt = now
    if (orderStatus === 'DELIVERED') {
      order.deliveredAt = now
      order.completionTime = now
      order.isRinged = false
      order.isRiderRinged = false
    }
    if (orderStatus === 'CANCELLED' || orderStatus === 'REJECTED') {
      order.cancelledAt = now
      order.isRinged = false
      order.isRiderRinged = false
    }

    if (
      orderStatus === 'ACCEPTED' &&
      (preparationEtaMinutes != null || deliveryEtaMinutes != null)
    ) {
      const { total } = applyOrderEtaFields(
        order,
        { preparationEtaMinutes, deliveryEtaMinutes },
        now.getTime()
      )
      order.acceptedEtaMinutes = total
    } else if (orderStatus === 'ACCEPTED' && order.acceptedEtaMinutes == null) {
      const fallback = resolveDefaultEta(restaurant)
      const { total } = applyOrderEtaFields(
        order,
        { preparationEtaMinutes: fallback, deliveryEtaMinutes: 0 },
        now.getTime()
      )
      order.acceptedEtaMinutes = total
    }

    await order.save()
    if (orderStatus === 'ACCEPTED' && order.acceptedEtaMinutes != null) {
      await syncRestaurantTimesFromOrder(order)
    }
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'updateStatus', {
      notifyExtraRiders: orderStatus === 'SEEKING_RIDER'
    })
    return serialized
  },

  // Store-app Enatega aliases (accept / cancel / pickup / mute ring)
  acceptOrder: async (_p, { _id, time }, ctx) => {
    const minutes = Math.max(0, parseInt(String(time || '0'), 10) || 0)
    return adminMutations.updateStatus(
      _p,
      {
        id: _id,
        orderStatus: 'ACCEPTED',
        preparationEtaMinutes: minutes || undefined,
        deliveryEtaMinutes: 0
      },
      ctx
    )
  },

  assignOrder: async (_p, { id: orderId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['RIDER', 'SUPER_ADMIN'])
    const riderUser = await User.findById(auth.userId)
    if (!riderUser || riderUser.role !== 'RIDER') {
      if (auth.role !== 'SUPER_ADMIN') throw forbidden()
    }
    const riderDoc = riderUser || (await User.findById(auth.userId))
    if (!riderDoc) throw forbidden()

    const orderRef = String(orderId || '')
    const existing =
      (await Order.findById(orderRef).catch(() => null)) ||
      (await Order.findOne({ orderId: orderRef }))
    if (!existing) throw new GraphQLError('Order not found')

    const isSeeking = existing.orderStatus === 'SEEKING_RIDER'
    const isRestaurantOpen =
      existing.orderStatus === 'ACCEPTED' && !existing.rider && !existing.isPickedUp

    if (!isSeeking && !isRestaurantOpen) {
      throw badInput('Order is not available for assignment')
    }

    if (isSeeking) {
      if (riderDoc.available === false || !riderDoc.acceptExtraOrders) {
        throw forbidden('Włącz przyjmowanie dodatkowych zamówień')
      }
    } else if (String(riderDoc.restaurantId) !== String(existing.restaurantId)) {
      throw forbidden()
    }

    const riderPayload = {
      _id: String(riderDoc._id),
      id: String(riderDoc._id),
      name: riderDoc.name,
      username: String(riderDoc.email || '').split('@')[0],
      phone: riderDoc.phone || '',
      available: riderDoc.available !== false
    }

    const now = new Date()
    // Atomic claim — first rider wins.
    const claimed = await Order.findOneAndUpdate(
      {
        _id: existing._id,
        orderStatus: isSeeking ? 'SEEKING_RIDER' : 'ACCEPTED',
        $or: [{ rider: null }, { rider: { $exists: false } }]
      },
      {
        $set: {
          rider: riderPayload,
          orderStatus: 'ACCEPTED',
          acceptedAt: existing.acceptedAt || now,
          isRinged: false,
          isRiderRinged: true
        }
      },
      { new: true }
    )
    if (!claimed) {
      throw badInput('Zamówienie zostało już przejęte przez innego kierowcę')
    }

    if (!claimed.acceptedEtaMinutes) {
      const restaurant = await Restaurant.findById(claimed.restaurantId).lean()
      const fallback = resolveDefaultEta(restaurant)
      const { total } = applyOrderEtaFields(
        claimed,
        { preparationEtaMinutes: fallback, deliveryEtaMinutes: 0 },
        now.getTime()
      )
      claimed.acceptedEtaMinutes = total
      await claimed.save()
      await syncRestaurantTimesFromOrder(claimed)
    }

    const serialized = await serializeOrder(claimed.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(claimed, serialized, 'assignOrder')
    return serialized
  },

  toggleAvailablity: async (_p, { id: riderId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['RIDER', 'SUPER_ADMIN'])
    const targetId = riderId || auth.userId
    if (auth.role === 'RIDER' && String(targetId) !== String(auth.userId)) {
      throw forbidden()
    }
    const rider = await User.findById(targetId)
    if (!rider || rider.role !== 'RIDER') throw badInput('Rider not found')
    rider.available = !(rider.available !== false)
    await rider.save()
    return {
      _id: id(rider),
      name: rider.name,
      username: String(rider.email || '').split('@')[0],
      available: rider.available !== false,
      acceptExtraOrders: Boolean(rider.acceptExtraOrders),
      phone: rider.phone || '',
      restaurantId: rider.restaurantId ? id(rider.restaurantId) : null,
      location: null
    }
  },

  toggleAcceptExtraOrders: async (_p, { id: riderId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['RIDER', 'SUPER_ADMIN'])
    const targetId = riderId || auth.userId
    if (auth.role === 'RIDER' && String(targetId) !== String(auth.userId)) {
      throw forbidden()
    }
    const rider = await User.findById(targetId)
    if (!rider || rider.role !== 'RIDER') throw badInput('Rider not found')
    rider.acceptExtraOrders = !Boolean(rider.acceptExtraOrders)
    await rider.save()
    return {
      _id: id(rider),
      name: rider.name,
      username: String(rider.email || '').split('@')[0],
      available: rider.available !== false,
      acceptExtraOrders: Boolean(rider.acceptExtraOrders),
      phone: rider.phone || '',
      restaurantId: rider.restaurantId ? id(rider.restaurantId) : null,
      location: null
    }
  },

  cancelOrder: async (_p, { _id, reason }, ctx) => {
    assertPublicAccess(ctx)
    const order = await Order.findById(_id)
    if (!order) throw new GraphQLError('Order not found')
    await assertCanManageRestaurantOrder(ctx, order)
    order.orderStatus = 'CANCELLED'
    order.cancelledAt = new Date()
    order.isRinged = false
    order.reason = reason || ''
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'cancelOrder')
    return serialized
  },

  orderPickedUp: async (_p, { _id }, ctx) => {
    return adminMutations.updateStatus(
      _p,
      { id: _id, orderStatus: 'PICKED' },
      ctx
    )
  },

  muteRing: async (_p, { orderId }, ctx) => {
    assertPublicAccess(ctx)
    // Store app may pass display orderId ("JT123...") or Mongo _id.
    const order =
      (await Order.findOne({ orderId })) ||
      (await Order.findById(orderId).catch(() => null))
    if (!order) throw new GraphQLError('Order not found')
    await assertCanManageRestaurantOrder(ctx, order)
    order.isRinged = false
    order.isRiderRinged = false
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'muteRing')
    return true
  },

  updateOrderEta: async (_p, { id: orderId, preparationEtaMinutes, deliveryEtaMinutes }, ctx) => {
    assertPublicAccess(ctx)
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    await assertCanManageRestaurantOrder(ctx, order)

    const now = Date.now()
    let shouldSyncRestaurantTimes = false
    if (
      deliveryEtaMinutes != null &&
      ['ASSIGNED', 'PICKED'].includes(order.orderStatus)
    ) {
      const mins = clampEtaMinutes(deliveryEtaMinutes)
      order.deliveryEtaMinutes = mins
      order.deliveryExpectedTime = new Date(now + mins * 60 * 1000)
      order.expectedTime = order.deliveryExpectedTime
      const prep = Number(order.preparationEtaMinutes ?? 0)
      order.acceptedEtaMinutes = Math.max(5, prep + mins)
    } else {
      const { total } = applyOrderEtaFields(
        order,
        { preparationEtaMinutes, deliveryEtaMinutes },
        now
      )
      if (preparationEtaMinutes != null || deliveryEtaMinutes != null) {
        order.acceptedEtaMinutes = total
        shouldSyncRestaurantTimes = true
      }
    }

    await order.save()
    if (shouldSyncRestaurantTimes) await syncRestaurantTimesFromOrder(order)
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'updateOrderEta')
    return serialized
  },

  updateRestaurantOrderTimes: async (
    _p,
    { restaurantId, deliveryTime, pickupTime, defaultEta, isBusy },
    ctx
  ) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    if (deliveryTime != null) restaurant.deliveryTime = Math.max(0, Math.min(240, Math.round(Number(deliveryTime))))
    if (pickupTime != null) restaurant.pickupTime = Math.max(5, Math.min(240, Math.round(Number(pickupTime))))
    if (defaultEta != null) restaurant.defaultEta = Math.max(5, Math.min(240, Math.round(Number(defaultEta))))
    if (typeof isBusy === 'boolean') restaurant.isBusy = isBusy
    if (defaultEta != null && pickupTime == null && deliveryTime == null) {
      restaurant.pickupTime = restaurant.defaultEta
      restaurant.deliveryTime = 0
    }
    await restaurant.save()
    const fresh = await withCurrentEta(await Restaurant.findById(restaurant._id).lean())
    const updated = await buildRestaurantTree(fresh, { audience: 'owner' })
    const eta = Number(updated.currentEta)
    pubsub.publish(RESTAURANT_UPDATED, {
      subscriptionRestaurantUpdated: {
        _id: String(restaurant._id),
        deliveryTime: eta,
        pickupTime: eta,
        defaultEta: resolveDefaultEta(restaurant),
        isBusy: Boolean(restaurant.isBusy),
        currentEta: eta
      }
    })
    return updated
  },

  suspendRestaurant: async (_p, { restaurantId, isSuspended, reason }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    restaurant.isSuspended = Boolean(isSuspended)
    restaurant.suspendedReason = isSuspended ? reason || '' : ''
    if (isSuspended) restaurant.isAvailable = false
    await restaurant.save()
    return buildRestaurantTree(restaurant.toObject(), { audience: 'owner' })
  },

  setRestaurantPause: async (_p, { restaurantId, paused, pausedUntil }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    if (paused) {
      restaurant.isAvailable = false
      restaurant.pausedUntil = pausedUntil
        ? new Date(pausedUntil)
        : new Date(Date.now() + 2 * 60 * 60 * 1000)
    } else {
      restaurant.isAvailable = true
      restaurant.pausedUntil = null
    }
    await restaurant.save()
    publishRestaurantTimes(restaurant)
    return buildRestaurantTree(restaurant.toObject(), { audience: 'owner' })
  },

  setRestaurantHolidays: async (_p, { restaurantId, holidays }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    restaurant.holidayExceptions = (holidays || []).map((h) => ({
      date: String(h.date || '').slice(0, 10),
      closed: h.closed !== false,
      open: h.closed === false ? h.open || null : null,
      close: h.closed === false ? h.close || null : null,
      label: h.label || ''
    }))
    await restaurant.save()
    return buildRestaurantTree(restaurant.toObject(), { audience: 'owner' })
  },

  updateTimings: async (_p, { id: restaurantId, openingTimes }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')

    restaurant.openingTimes = (openingTimes || []).map((day) => ({
      day: day.day,
      times: (day.times || [])
        .filter((slot) => Array.isArray(slot.startTime) && Array.isArray(slot.endTime))
        .map((slot) => ({
          startTime: slot.startTime.map(String),
          endTime: slot.endTime.map(String)
        }))
    }))
    await restaurant.save()
    return buildRestaurantTree(restaurant.toObject(), { audience: 'owner' })
  },

  settleRestaurantPeriod: async (_p, { restaurantId, periodKey }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN'])
    const row = await markSettlementSettled(
      restaurantId,
      periodKey || currentPeriodKey(),
      auth.userId
    )
    if (!row) throw new GraphQLError('Restaurant not found')
    return {
      ...row,
      periodStart: row.periodStart?.toISOString?.() || row.periodStart,
      periodEnd: row.periodEnd?.toISOString?.() || row.periodEnd,
      settledAt: row.settledAt ? new Date(row.settledAt).toISOString() : null
    }
  },

  refundOrder: async (_p, { orderId, amount }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])

    // Atomic claim: flips the status only if nobody else has refunded this
    // order yet, so two concurrent calls cannot both reach Stripe.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: { $ne: 'REFUNDED' } },
      { $set: { paymentStatus: 'REFUNDING' } },
      { new: true }
    )
    if (!order) {
      throw badInput('Zamówienie nie istnieje lub zostało już zwrócone')
    }

    const revert = async () => {
      order.paymentStatus = 'PAID'
      await order.save()
    }

    const method = String(order.paymentMethod || '').toUpperCase()
    if (method === 'COD') {
      await revert()
      throw badInput('Nie można zwrócić płatności gotówkowej (COD) przez Stripe')
    }

    // The refund can never exceed what the customer actually paid — the old
    // code accepted any client-supplied amount, including negative values.
    const paid = Number(order.paidAmount || order.orderAmount || 0)
    const requested = amount == null ? paid : toMoney(amount, -1)
    if (requested <= 0 || requested > paid) {
      await revert()
      throw badInput(`Kwota zwrotu musi mieścić się w zakresie 0–${paid.toFixed(2)}`)
    }
    const refundAmount = requested

    if (stripe) {
      if (!order.stripePaymentIntentId) {
        await revert()
        throw badInput('Brak identyfikatora płatności w bazie. Zrób zwrot z panelu Stripe.')
      }
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100)
        })
      } catch (err) {
        await revert()
        console.error('[stripe] refund failed', err)
        throw new GraphQLError('Zwrot w Stripe nie powiódł się', {
          extensions: { code: 'PAYMENT_PROVIDER_ERROR' }
        })
      }
    } else {
      // No provider configured: do not pretend the money went back.
      await revert()
      throw new GraphQLError('Stripe nie jest skonfigurowany — zwrot niemożliwy', {
        extensions: { code: 'PAYMENT_PROVIDER_ERROR' }
      })
    }

    order.paymentStatus = 'REFUNDED'
    order.refundedAt = new Date()
    order.refundAmount = refundAmount
    if (['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'PREPARING'].includes(order.orderStatus)) {
      order.orderStatus = 'CANCELLED'
      order.cancelledAt = new Date()
    }
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'refundOrder')
    return serialized
  },

  editRestaurant: async (_p, { restaurant: input }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireRestaurantOwner(ctx, input._id)
    const isAdmin = auth.role === 'SUPER_ADMIN'
    const restaurant = await Restaurant.findById(input._id)
    if (!restaurant) throw new GraphQLError('Restaurant not found')

    const assign = (field, value) => {
      if (value !== undefined && value !== null) restaurant[field] = value
    }
    assign('name', input.name)
    assign('address', input.address)
    assign('phone', input.phone)
    assign('image', input.image)
    assign('logo', input.logo)
    assign('deliveryTime', input.deliveryTime)
    assign('pickupTime', input.pickupTime)
    assign('minimumOrder', input.minimumOrder)
    assign('shopType', input.shopType)
    assign('tax', input.salesTax)
    assign('orderPrefix', input.orderPrefix)
    assign('cuisines', input.cuisines)
    assign('isAvailable', input.isAvailable)
    assign('openingTimes', input.openingTimes)
    assign('freeDelivery', input.freeDelivery)
    assign('freeDeliveryFrom', input.freeDeliveryFrom)

    if (
      input.companyRegNo != null ||
      input.bussinessRegNo != null ||
      input.accountName != null
    ) {
      restaurant.bussinessDetails = {
        ...(restaurant.bussinessDetails?.toObject?.() || restaurant.bussinessDetails || {}),
        ...(input.companyRegNo != null ? { companyRegNo: String(input.companyRegNo) } : {}),
        ...(input.bussinessRegNo != null ? { bussinessRegNo: String(input.bussinessRegNo) } : {}),
        ...(input.accountName != null ? { accountName: String(input.accountName) } : {})
      }
    }

    // Platform-controlled fields. An owner used to be able to set their own
    // commission to 0 % and lift a suspension imposed by the platform.
    if (isAdmin) {
      assign('commissionRate', input.commissionRate)
      assign('isSuspended', input.isSuspended)
      assign('suspendedReason', input.suspendedReason)
    }
    if (input.pausedUntil !== undefined) {
      restaurant.pausedUntil = input.pausedUntil ? new Date(input.pausedUntil) : null
    }
    if (input.holidayExceptions != null) {
      restaurant.holidayExceptions = input.holidayExceptions
    }
    await restaurant.save()

    if (input.password) {
      // Resetting someone else's password is an admin action; an owner changes
      // their own password through changePassword (which asks for the old one).
      if (!isAdmin) throw forbidden('Zmiana hasła właściciela wymaga uprawnień administratora')
      if (String(input.password).length < MIN_PASSWORD_LENGTH) {
        throw badInput(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`)
      }
      const owner = await User.findById(restaurant.ownerId)
      if (owner) {
        owner.password = input.password
        await owner.save()
      }
    }

    if (input.deliveryTime != null || input.pickupTime != null) {
      pubsub.publish(RESTAURANT_UPDATED, {
        subscriptionRestaurantUpdated: {
          _id: String(restaurant._id),
          deliveryTime: restaurant.deliveryTime,
          pickupTime: restaurant.pickupTime
        }
      })
    }

    return buildRestaurantTreeById(restaurant._id)
  },

  createRestaurant: async (_p, { restaurant, ownerName, ownerLogin, ownerPassword }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])

    const login = (ownerLogin || '').trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
      throw badInput('Login może zawierać 3–32 znaki: litery, cyfry, . _ -')
    }
    if (String(ownerPassword || '').length < MIN_PASSWORD_LENGTH) {
      throw badInput(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`)
    }

    // Store login as email@jedzto.local — the User model requires a unique email field.
    // The ownerLogin resolver accepts both bare login and full email variants.
    const email = `${login}@jedzto.local`
    if (await User.findOne({ email })) {
      throw new GraphQLError('A user with this login already exists')
    }

    const owner = await User.create({
      email,
      password: ownerPassword,
      name: ownerName || login,
      role: 'RESTAURANT_OWNER'
    })

    let created
    try {
      created = await Restaurant.create({
        ownerId: owner._id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone || '',
        image: restaurant.image || '',
        logo: restaurant.logo || '',
        deliveryTime: restaurant.deliveryTime ?? 30,
        pickupTime: restaurant.pickupTime ?? 20,
        minimumOrder: restaurant.minimumOrder ?? 25,
        tax: restaurant.salesTax ?? 8,
        shopType: restaurant.shopType || 'restaurant',
        cuisines: restaurant.cuisines || [],
        commissionRate: restaurant.commissionRate ?? 10
      })
    } catch (err) {
      await User.deleteOne({ _id: owner._id })
      throw err
    }

    owner.restaurantId = created._id
    await owner.save()

    return {
      restaurant: await buildRestaurantTree(created.toObject()),
      owner: {
        userId: id(owner),
        login,
        password: ownerPassword,
        role: owner.role,
        restaurantId: id(created)
      }
    }
  },

  hardDeleteRestaurant: async (_p, { id: restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const existing = await Restaurant.findById(restaurantId).select('ownerId').lean()
    if (!existing) return false
    await Promise.all([
      Food.deleteMany({ restaurantId }),
      Category.deleteMany({ restaurantId }),
      // Orders are financial records and are deliberately kept.
      // The owner account is deactivated instead of being left as a valid
      // login with no restaurant attached.
      User.updateMany(
        { restaurantId },
        { $set: { restaurantId: null, isActive: false } }
      )
    ])
    await Restaurant.deleteOne({ _id: restaurantId })
    return true
  },

  createRider: async (_p, { name, login, password, restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const bareLogin = String(login || '')
      .trim()
      .toLowerCase()
      .replace(/@.*$/, '')
    if (!bareLogin) throw badInput('Login is required')
    if (String(password || '').length < 6) {
      throw badInput('Hasło musi mieć co najmniej 6 znaków')
    }
    const restaurant = await Restaurant.findById(restaurantId).select('_id name').lean()
    if (!restaurant) throw badInput('Restaurant not found')

    const email = `${bareLogin}@jedzto.local`
    if (await User.exists({ email })) {
      throw badInput('Login already exists')
    }

    const rider = await User.create({
      email,
      password: String(password),
      name: String(name || bareLogin).trim() || bareLogin,
      role: 'RIDER',
      restaurantId: restaurant._id,
      isActive: true,
      available: true,
      acceptExtraOrders: false
    })

    return {
      userId: id(rider),
      login: bareLogin,
      email,
      name: rider.name,
      restaurantId: id(restaurant),
      restaurantName: restaurant.name
    }
  },

  createShopType: async (_p, { dto }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    if (!dto?.name) {
      throw new GraphQLError('name is required', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    const baseId = slugify(dto.name) || 'shop-type'
    let typeId = baseId
    let suffix = 1
    while (await ShopType.exists({ _id: typeId })) {
      typeId = `${baseId}-${suffix}`
      suffix += 1
    }
    const shopType = await ShopType.create({
      _id: typeId,
      name: dto.name,
      image: dto.image || '',
      isActive: true
    })
    return { ...shopType.toObject(), slug: shopType._id }
  },

  updateShopType: async (_p, { dto }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    if (!dto?._id) {
      throw new GraphQLError('_id is required', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    const update = {}
    if (dto.name !== undefined) update.name = dto.name
    if (dto.image !== undefined) update.image = dto.image
    if (dto.isActive !== undefined) update.isActive = dto.isActive
    const shopType = await ShopType.findByIdAndUpdate(dto._id, update, { new: true }).lean()
    if (!shopType) return null
    return { ...shopType, slug: shopType._id }
  },

  deleteShopType: async (_p, { id: shopTypeId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const shopType = await ShopType.findByIdAndDelete(shopTypeId).lean()
    if (!shopType) return null
    return { ...shopType, slug: shopType._id }
  },

  createTasteCategory: async (_p, { input }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const name = String(input?.name || '').trim()
    if (!name) {
      throw new GraphQLError('name is required', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    const maxSort = await TasteCategory.findOne()
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean()
    const created = await TasteCategory.create({
      name,
      image: String(input?.image || '').trim(),
      imageContain: Boolean(input?.imageContain),
      shopType: String(input?.shopType || 'restaurant').trim() || 'restaurant',
      sortOrder:
        input?.sortOrder != null ? Number(input.sortOrder) : (maxSort?.sortOrder || 0) + 10,
      isActive: input?.isActive !== false
    })
    return created.toObject()
  },

  updateTasteCategory: async (_p, { id: categoryId, input }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    if (!categoryId) {
      throw new GraphQLError('id is required', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    const update = {}
    if (input?.name !== undefined) {
      const name = String(input.name || '').trim()
      if (!name) {
        throw new GraphQLError('name is required', { extensions: { code: 'BAD_USER_INPUT' } })
      }
      update.name = name
    }
    if (input?.image !== undefined) update.image = String(input.image || '').trim()
    if (input?.imageContain !== undefined) update.imageContain = Boolean(input.imageContain)
    if (input?.shopType !== undefined) {
      update.shopType = String(input.shopType || 'restaurant').trim() || 'restaurant'
    }
    if (input?.sortOrder !== undefined) update.sortOrder = Number(input.sortOrder) || 0
    if (input?.isActive !== undefined) update.isActive = Boolean(input.isActive)
    return TasteCategory.findByIdAndUpdate(categoryId, update, { new: true }).lean()
  },

  deleteTasteCategory: async (_p, { id: categoryId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const deleted = await TasteCategory.findByIdAndDelete(categoryId).lean()
    return Boolean(deleted)
  },

  reorderTasteCategories: async (_p, { ids }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const list = Array.isArray(ids) ? ids.map(String) : []
    await Promise.all(
      list.map((categoryId, index) =>
        TasteCategory.updateOne({ _id: categoryId }, { $set: { sortOrder: (index + 1) * 10 } })
      )
    )
    return TasteCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()
  },

  updateDeliveryAreas: async (_p, { restaurantId, areas }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)

    for (const area of areas) {
      const name = area.name?.trim()
      if (!name) throw new GraphQLError('Nazwa obszaru nie może być pusta')
      if (area.fee < 0) throw new GraphQLError(`Opłata za "${name}" nie może być ujemna`)
      if (area.radiusKm <= 0) throw new GraphQLError(`Promień dla "${name}" musi być większy od zera`)
    }

    // Check for duplicate names (case/diacritic insensitive)
    const names = new Set()
    for (const area of areas) {
      const key = normalizeAreaName(area.name.trim())
      if (names.has(key)) throw new GraphQLError(`Obszar "${area.name}" występuje dwukrotnie`)
      names.add(key)
    }

    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    restaurant.deliveryAreas = areas.map((a) => ({
      name: a.name.trim(),
      fee: a.fee,
      minOrder: a.minOrder ?? 0,
      latitude: a.latitude,
      longitude: a.longitude,
      radiusKm: a.radiusKm,
      isActive: a.isActive !== false
    }))
    await restaurant.save()
    return buildRestaurantTreeById(restaurantId)
  },

  // Order placement is kept here because it needs the full restaurant + ETA context.
  placeOrder: async (_p, args, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const restaurant = await Restaurant.findById(args.restaurant)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    const unavailable = restaurantUnavailableReason(restaurant)
    if (unavailable) {
      throw new GraphQLError(
        unavailable === 'SUSPENDED'
          ? 'Restaurant is suspended'
          : unavailable === 'HOLIDAY'
            ? 'Restaurant is closed today'
            : 'Restaurant is not accepting orders',
        { extensions: { code: 'RESTAURANT_UNAVAILABLE', reason: unavailable } }
      )
    }

    const customer = await User.findById(auth.userId).lean()
    const phoneKey = normalizePhone(customer?.phone)
    if (args.couponCode && (!phoneKey || !customer?.phoneIsVerified)) {
      throw new GraphQLError('Aby użyć kuponu, zweryfikuj numer telefonu', {
        extensions: { code: 'BAD_USER_INPUT' }
      })
    }

    // Single source of truth for money: menu prices, delivery area fees,
    // surcharges and discounts are all resolved server-side.
    const pricing = await priceOrder(restaurant, args, { phone: phoneKey })
    const {
      items,
      orderAmount,
      paymentMethod,
      isPickup,
      commissionRate,
      platformCommission
    } = pricing

    const prepMins = clampEtaMinutes(restaurant.pickupTime ?? 20, 20)
    const deliveryMins = isPickup
      ? 0
      : restaurant.deliveryTime == null
        ? 15
        : clampEtaMinutes(restaurant.deliveryTime, 0, { min: 0 })
    const totalMins = Math.max(5, prepMins + deliveryMins)

    const order = await Order.create({
      orderId: `JT${Date.now().toString().slice(-8)}`,
      restaurantId: restaurant._id,
      customerId: auth.userId,
      items,
      paymentMethod,
      paidAmount: 0,
      orderAmount,
      platformCommissionRate: commissionRate,
      platformCommission,
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      isRinged: !isOnlineCardMethod(paymentMethod),
      tipping: pricing.tipping,
      taxationAmount: pricing.taxationAmount,
      deliveryCharges: pricing.deliveryCharges,
      discountAmount: pricing.discountAmount,
      isPickedUp: isPickup,
      instructions: String(args.instructions || '').slice(0, 500),
      // The client may not backdate an order.
      orderDate: new Date(),
      expectedTime: new Date(Date.now() + totalMins * 60 * 1000),
      preparationTime: new Date(Date.now() + prepMins * 60 * 1000),
      preparationEtaMinutes: prepMins,
      deliveryEtaMinutes: deliveryMins,
      deliveryExpectedTime: isPickup ? null : new Date(Date.now() + totalMins * 60 * 1000),
      deliveryAddress: {
        location: {
          coordinates: [
            toLongitude(args.address?.longitude, 19.9381),
            toLatitude(args.address?.latitude, 49.8339)
          ]
        },
        deliveryAddress: cleanPolishAddress(
          String(args.address?.deliveryAddress || '')
        ).slice(0, 300),
        details: String(args.address?.details || '').slice(0, 300),
        label: String(args.address?.label || 'Other').slice(0, 60)
      }
    })

    if (pricing.coupon) {
      try {
        await CouponRedemption.create({
          couponId: pricing.coupon._id,
          phone: phoneKey,
          orderId: order._id
        })
        // Atomic increment keeps the usage limit honest under concurrency.
        await Coupon.updateOne({ _id: pricing.coupon._id }, { $inc: { usedCount: 1 } })
      } catch (err) {
        await Order.deleteOne({ _id: order._id })
        if (err?.code === 11000) {
          throw new GraphQLError('Ten numer telefonu już wykorzystał ten kod rabatowy', {
            extensions: { code: 'BAD_USER_INPUT' }
          })
        }
        throw err
      }
    }

    const serialized = await serializeOrder(order.toObject())
    await publishOrderChanged(order, serialized, 'placeOrder', {
      notifyKitchen: !isOnlineCardMethod(paymentMethod)
    })

    return serialized
  },

  // ---- Super Admin: customer Users screen --------------------------------
  deleteUser: async (_p, { id: userId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const user = await User.findById(userId)
    if (!user || user.role !== 'CUSTOMER') {
      throw badInput('User not found')
    }
    const shape = adminUserShape(user)
    await User.deleteOne({ _id: user._id })
    return shape
  },

  updateUserStatus: async (_p, { id: userId, status, reason }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const next = String(status || '').toLowerCase().trim()
    const user = await User.findById(userId)
    if (!user || user.role !== 'CUSTOMER') {
      throw badInput('User not found')
    }

    // Deactivate / delete from admin = hard remove (same as app Deactivate).
    if (next === 'deactivate' || next === 'deleted' || next === 'delete') {
      const shape = adminUserShape(user)
      shape.status = 'deactivate'
      await User.deleteOne({ _id: user._id })
      return shape
    }

    if (next === 'blocked' || next === 'block') {
      user.isActive = false
      user.adminStatus = 'blocked'
      if (reason) user.notes = [user.notes, `Block: ${reason}`].filter(Boolean).join('\n').slice(0, 2000)
      await user.save()
      return adminUserShape(user)
    }

    if (next === 'active' || next === 'activate' || next === 'unblock') {
      user.isActive = true
      user.adminStatus = 'active'
      await user.save()
      return adminUserShape(user)
    }

    throw badInput(`Unknown status: ${status}`)
  },

  updateUserNotes: async (_p, { id: userId, notes }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const user = await User.findById(userId)
    if (!user || user.role !== 'CUSTOMER') {
      throw badInput('User not found')
    }
    user.notes = String(notes || '').slice(0, 2000)
    await user.save()
    return adminUserShape(user)
  },

  resetUserSession: async (_p, { userId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const user = await User.findById(userId)
    if (!user || user.role !== 'CUSTOMER') {
      throw badInput('User not found')
    }
    user.notificationToken = null
    await user.save()
    return adminUserShape(user)
  }
}
