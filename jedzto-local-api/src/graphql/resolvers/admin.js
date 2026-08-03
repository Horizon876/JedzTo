/**
 * resolvers/admin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin and restaurant-owner mutations: order status updates, ETA management,
 * restaurant CRUD, shop type CRUD, delivery areas and settlements.
 */

import { GraphQLError } from 'graphql'
import { User, Restaurant, Category, Food, Order, ShopType } from '../../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  requireRestaurantOwner
} from '../../auth/jwt.js'
import { generateTemporaryPassword } from '../../utils/password.js'
import { resolveDefaultEta } from '../../services/eta.js'
import { markSettlementSettled, currentPeriodKey } from '../../services/settlements.js'
import { publishOrderChanged, isOnlineCardMethod, kitchenOrdersMongoFilter } from '../../services/orderNotify.js'
import { withCurrentEta } from '../../services/eta.js'
import { restaurantUnavailableReason } from '../../services/restaurantAvailability.js'
import {
  pubsub,
  ORDER_STATUS,
  ORDER_CHANGED,
  RESTAURANT_UPDATED
} from '../orderPubsub.js'
import {
  id,
  toCoord,
  clampEtaMinutes,
  slugify,
  normalizeAreaName,
  applyOrderEtaFields,
  profileShape,
  mapUserType
} from './helpers.js'
import {
  buildRestaurantTree,
  buildRestaurantTreeById,
  publishRestaurantTimes,
  RestaurantFieldResolvers
} from './restaurant.js'
import { serializeOrder, ACTIVE } from './orders.js'

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
  abortOrder: async (_p, { id: orderId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx)
    const updated = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: 'CANCELLED', cancelledAt: new Date() },
      { new: true }
    ).lean()
    return serializeOrder(updated)
  },

  Coupon: (_p, { coupon }, ctx) => {
    assertPublicAccess(ctx)
    if (coupon?.toUpperCase() === 'JEDZTO') {
      return { _id: 'c1', title: 'JEDZTO', discount: 10, enabled: true }
    }
    throw new GraphQLError('Invalid coupon')
  },

  sendChatMessage: async (_p, { orderId, messageInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    const data = {
      id: String(Date.now()),
      message: messageInput.message || '',
      image: messageInput.image || null,
      user: { id: id(user), name: user.name },
      createdAt: new Date().toISOString()
    }
    const { CHAT_MESSAGE } = await import('../orderPubsub.js')
    pubsub.publish(CHAT_MESSAGE, { subscriptionNewMessage: data, orderId })
    return { success: true, message: 'ok', data }
  },

  reviewOrder: async (_p, { order, rating, description }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx)
    const updated = await Order.findByIdAndUpdate(
      order,
      {
        review: {
          _id: String(Date.now()),
          rating,
          description: description || '',
          createdAt: new Date().toISOString()
        }
      },
      { new: true }
    ).lean()
    return serializeOrder(updated)
  },

  updateOrderStatus: async (_p, { orderId, status }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    if (auth.role === 'RESTAURANT_OWNER') {
      const restaurant = await Restaurant.findById(order.restaurantId)
      if (String(restaurant?.ownerId) !== String(auth.userId)) {
        throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
      }
    }
    order.orderStatus = status
    await order.save()
    const serialized = await serializeOrder(order.toObject())
    pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
    await publishOrderChanged(order, serialized, 'updateOrderStatus')
    return serialized
  },

  updateStatus: async (
    _p,
    { id: orderId, orderStatus, preparationEtaMinutes, deliveryEtaMinutes },
    ctx
  ) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    if (auth.role === 'RESTAURANT_OWNER') {
      const restaurant = await Restaurant.findById(order.restaurantId).select('ownerId').lean()
      if (String(restaurant?.ownerId) !== String(auth.userId)) {
        throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
      }
    }

    order.orderStatus = orderStatus
    const now = new Date()
    if (orderStatus === 'ACCEPTED') order.acceptedAt = now
    if (orderStatus === 'ASSIGNED') order.assignedAt = now
    if (orderStatus === 'PICKED') order.pickedAt = now
    if (orderStatus === 'DELIVERED') {
      order.deliveredAt = now
      order.completionTime = now
    }
    if (orderStatus === 'CANCELLED' || orderStatus === 'REJECTED') {
      order.cancelledAt = now
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
      const restaurant = await Restaurant.findById(order.restaurantId).lean()
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
    await publishOrderChanged(order, serialized, 'updateStatus')
    return serialized
  },

  updateOrderEta: async (_p, { id: orderId, preparationEtaMinutes, deliveryEtaMinutes }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    if (auth.role === 'RESTAURANT_OWNER') {
      const restaurant = await Restaurant.findById(order.restaurantId).select('ownerId').lean()
      if (String(restaurant?.ownerId) !== String(auth.userId)) {
        throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
      }
    }

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
      date: h.date,
      closed: h.closed !== false,
      open: h.open || null,
      close: h.close || null,
      label: h.label || ''
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
    const order = await Order.findById(orderId)
    if (!order) throw new GraphQLError('Order not found')
    const method = String(order.paymentMethod || '').toUpperCase()
    if (method === 'COD') throw new GraphQLError('Cannot refund cash (COD) orders via Stripe')
    if (order.paymentStatus === 'REFUNDED') throw new GraphQLError('Order already refunded')
    const refundAmount = amount != null ? Number(amount) : Number(order.orderAmount || 0)
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
    requireRestaurantOwner(ctx, input._id)
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
    assign('commissionRate', input.commissionRate)
    assign('isSuspended', input.isSuspended)
    assign('suspendedReason', input.suspendedReason)
    assign('freeDelivery', input.freeDelivery)
    assign('freeDeliveryFrom', input.freeDeliveryFrom)
    if (input.pausedUntil !== undefined) {
      restaurant.pausedUntil = input.pausedUntil ? new Date(input.pausedUntil) : null
    }
    if (input.holidayExceptions != null) {
      restaurant.holidayExceptions = input.holidayExceptions
    }
    await restaurant.save()

    if (input.password) {
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

  createRestaurant: async (_p, { restaurant, ownerName, ownerEmail }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const email = (ownerEmail || '').toLowerCase().trim()
    if (!email) throw new GraphQLError('Owner email is required')
    if (await User.findOne({ email })) {
      throw new GraphQLError('A user with this email already exists')
    }

    const temporaryPassword = generateTemporaryPassword()
    const owner = await User.create({
      email,
      password: temporaryPassword,
      name: ownerName,
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
        cuisines: restaurant.cuisines || []
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
        email: owner.email,
        temporaryPassword,
        role: owner.role,
        restaurantId: id(created)
      }
    }
  },

  hardDeleteRestaurant: async (_p, { id: restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const existing = await Restaurant.findById(restaurantId)
    if (!existing) return false
    await Food.deleteMany({ restaurantId })
    await Category.deleteMany({ restaurantId })
    await User.updateMany({ restaurantId }, { $set: { restaurantId: null } })
    await Restaurant.deleteOne({ _id: restaurantId })
    return true
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

    const { Food: FoodModel } = await import('../../models/index.js')
    const items = []
    for (const line of args.orderInput || []) {
      const foodDoc = await FoodModel.findById(line.food).lean()
      const variation =
        (foodDoc?.variations || []).find(
          (v) => String(v._id) === String(line.variation)
        ) || foodDoc?.variations?.[0]

      items.push({
        food: foodDoc?._id || line.food,
        title: foodDoc?.title || 'Pozycja',
        description: foodDoc?.description || '',
        image: foodDoc?.image || null,
        quantity: line.quantity || 1,
        variation: variation
          ? {
              _id: variation._id,
              title: variation.title,
              price: variation.price,
              discounted: variation.discounted || 0
            }
          : { _id: line.variation, title: 'Standard', price: 0, discounted: 0 },
        addons: [],
        specialInstructions: line.specialInstructions || ''
      })
    }

    const itemsTotal = items.reduce(
      (sum, item) => sum + (item.variation?.price || 0) * item.quantity,
      0
    )
    const orderAmount =
      itemsTotal +
      (args.deliveryCharges || 0) +
      (args.tipping || 0) +
      (args.taxationAmount || 0)

    const paymentMethod = (args.paymentMethod || 'COD').toUpperCase()
    const isPickup = Boolean(args.isPickedUp)
    const commissionRate = Number(restaurant.commissionRate ?? 10)
    const platformCommission = Math.round(((orderAmount * commissionRate) / 100) * 100) / 100
    const prepMins = clampEtaMinutes(restaurant.pickupTime ?? 20, 20)
    const deliveryMins = isPickup
      ? 0
      : restaurant.deliveryTime == null
        ? 15
        : clampEtaMinutes(restaurant.deliveryTime, 0, { min: 0 })
    const totalMins = Math.max(5, prepMins + deliveryMins)

    const { Order: OrderModel } = await import('../../models/index.js')
    const order = await OrderModel.create({
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
      tipping: args.tipping || 0,
      taxationAmount: args.taxationAmount || 0,
      deliveryCharges: args.deliveryCharges || 0,
      isPickedUp: isPickup,
      instructions: args.instructions || '',
      orderDate: args.orderDate ? new Date(args.orderDate) : new Date(),
      expectedTime: new Date(Date.now() + totalMins * 60 * 1000),
      preparationTime: new Date(Date.now() + prepMins * 60 * 1000),
      preparationEtaMinutes: prepMins,
      deliveryEtaMinutes: deliveryMins,
      deliveryExpectedTime: isPickup ? null : new Date(Date.now() + totalMins * 60 * 1000),
      deliveryAddress: {
        location: {
          coordinates: [
            toCoord(args.address?.longitude, 19.9381),
            toCoord(args.address?.latitude, 49.8339)
          ]
        },
        deliveryAddress: args.address?.deliveryAddress || '',
        details: args.address?.details || '',
        label: args.address?.label || 'Other'
      }
    })

    const serialized = await serializeOrder(order.toObject())
    await publishOrderChanged(order, serialized, 'placeOrder', {
      notifyKitchen: !isOnlineCardMethod(paymentMethod)
    })

    return serialized
  }
}
