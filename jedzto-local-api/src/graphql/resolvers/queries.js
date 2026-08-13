/**
 * resolvers/queries.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All GraphQL Query resolvers. Delegates to helpers, orders, restaurant and
 * auth modules for the actual logic.
 */

import mongoose from 'mongoose'
import { GraphQLError } from 'graphql'
import {
  User,
  Restaurant,
  Category,
  Food,
  Order,
  ShopType,
  Coupon
} from '../../models/index.js'
import { assertPublicAccess, requireUser, requireRestaurantOwner } from '../../auth/jwt.js'
import { liveCategories, mapFood } from '../../services/menu.js'
import { kitchenOrdersMongoFilter } from '../../services/orderNotify.js'
import { resolveDefaultEta } from '../../services/eta.js'
import {
  listSettlementsForPeriod,
  upsertSettlementPreview,
  currentPeriodKey
} from '../../services/settlements.js'
import { STRIPE_PUBLISHABLE_KEY, ALLOW_TEST_OTP, NODE_ENV } from '../../config.js'
import { containsFilter, clampPageSize, clampNonNegative } from '../../utils/sanitize.js'
import {
  id,
  toPreview,
  adminUserShape,
  resolveDelivery,
  audienceFor,
  couponShape
} from './helpers.js'
import {
  buildRestaurantTree,
  buildRestaurantTreeById,
  listRestaurants
} from './restaurant.js'
import {
  serializeOrder,
  serializeOrders,
  paginateOrders,
  orderSearchFilter,
  orderStatusFilter,
  statsDateRange,
  assertCanReadRestaurantOrders,
  loadAuthorizedOrder,
  ACTIVE,
  CANCELLED,
  MAX_ORDER_PAGE_SIZE
} from './orders.js'
import { authQueries } from './auth.js'
import { menuPublishStatusOf } from './menu.js'

// ---------------------------------------------------------------------------
// Shared static config returned to all clients
// ---------------------------------------------------------------------------

const CONFIG = {
  _id: 'jedzto-config',
  currency: 'PLN',
  currencySymbol: 'zł',
  deliveryRate: 9.99,
  twilioEnabled: false,
  appAmplitudeApiKey: '',
  customerAppSentryUrl: '',
  termsAndConditions: 'https://jedzto.pl/terms',
  privacyPolicy: 'https://jedzto.pl/privacy',
  // Only ever exposed while the dev OTP bypass is active; in production the
  // client must not be told any code at all.
  testOtp: ALLOW_TEST_OTP ? '123456' : '',
  skipMobileVerification: NODE_ENV !== 'production',
  skipEmailVerification: NODE_ENV !== 'production',
  costType: 'fixed',
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  secretKey: '',
  googlePlacesApiBaseUrl: 'https://maps.googleapis.com/maps/api',
  riderAppSentryUrl: ''
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
// NOTE: these used CommonJS `require('../../models')` inside an ESM module,
// which threw "require is not defined" on every call — the whole coupon
// feature was dead code. Now a static ESM import, with access scoped by role.
/**
 * Restricts a coupon query to what the caller may see: a restaurant owner only
 * gets their own and the platform-wide ones, a customer only enabled ones.
 */
const couponScopeFor = (ctx) => {
  const user = ctx?.user
  if (user?.role === 'SUPER_ADMIN') return {}
  if (user?.role === 'RESTAURANT_OWNER') {
    return { $or: [{ restaurantId: user.restaurantId || null }, { restaurantId: null }] }
  }
  return { enabled: true }
}

async function coupons(ctx) {
  assertPublicAccess(ctx)
  const docs = await Coupon.find(couponScopeFor(ctx)).limit(200).lean()
  return docs.map(couponShape)
}

async function couponsPaginated(ctx, args) {
  assertPublicAccess(ctx)
  requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])

  const page = Math.max(1, clampNonNegative(args.page, 1))
  const limit = clampPageSize(args.limit, 10)
  const filter = { ...couponScopeFor(ctx) }
  if (args.search) filter.title = containsFilter(args.search)
  if (args.enabled !== undefined && args.enabled !== null) filter.enabled = args.enabled

  const [docs, totalCount] = await Promise.all([
    Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Coupon.countDocuments(filter)
  ])

  return {
    data: docs.map(couponShape),
    totalCount,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit))
  }
}

// ---------------------------------------------------------------------------
// Dashboard analytics helpers
// ---------------------------------------------------------------------------

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

async function dashboardCounts(year) {
  const scope = (from, to) => (from ? { createdAt: { $gte: from, $lt: to } } : {})
  const countAll = async (range) => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const [users, owners, restaurants, orders, monthlyOrders] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER', ...range }),
      User.countDocuments({ role: 'RESTAURANT_OWNER', ...range }),
      Restaurant.countDocuments({ ...range }),
      Order.countDocuments({ ...range }),
      Order.countDocuments({ createdAt: { $gte: firstDayOfMonth } })
    ])
    return { usersCount: users, vendorsCount: owners, restaurantsCount: restaurants, ordersCount: orders, monthlyOrdersCount: monthlyOrders, ridersCount: 0 }
  }

  if (!year) return { ...(await countAll({})), percentageChange: null }

  const [current, previous] = await Promise.all([
    countAll(scope(new Date(year, 0, 1), new Date(year + 1, 0, 1))),
    countAll(scope(new Date(year - 1, 0, 1), new Date(year, 0, 1)))
  ])

  return {
    ...current,
    percentageChange: {
      usersPercent: percentChange(current.usersCount, previous.usersCount),
      vendorsPercent: percentChange(current.vendorsCount, previous.vendorsCount),
      restaurantsPercent: percentChange(current.restaurantsCount, previous.restaurantsCount),
      ridersPercent: 0
    }
  }
}

/**
 * Aggregates order counts/sales per restaurant in the database instead of
 * streaming every order document into Node just to sum a field.
 */
async function ordersGroupedByRestaurant(metric) {
  const rows = await Order.aggregate([
    { $match: { orderStatus: { $nin: [...CANCELLED] } } },
    {
      $group: {
        _id: '$restaurantId',
        value: metric === 'sales' ? { $sum: '$orderAmount' } : { $sum: 1 }
      }
    },
    { $sort: { value: -1 } },
    {
      $lookup: {
        from: 'restaurants',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'restaurant'
      }
    }
  ])

  return rows.map((row) => ({
    label: row.restaurant?.[0]?.name || 'Nieznana restauracja',
    value: Number((row.value || 0).toFixed(2))
  }))
}

async function monthlySalesAndOrders(restaurantId, year) {
  const rows = await Order.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
        orderStatus: { $nin: [...CANCELLED] },
        createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        sales: { $sum: '$orderAmount' },
        count: { $sum: 1 }
      }
    }
  ])

  const salesAmount = Array(12).fill(0)
  const ordersCount = Array(12).fill(0)
  for (const row of rows) {
    const index = row._id - 1
    salesAmount[index] = Number((row.sales || 0).toFixed(2))
    ordersCount[index] = row.count
  }

  return { salesAmount, ordersCount }
}

async function paymentMethodStats(restaurantId, options) {
  const orders = await Order.find({
    restaurantId,
    orderStatus: { $nin: [...CANCELLED] },
    ...statsDateRange(options)
  })
    // Projection: this report only sums four numeric fields, so there is no
    // reason to hydrate item arrays and addresses for every order.
    .select('orderAmount deliveryCharges paymentMethod isPickedUp')
    .lean()

  // Single pass per bucket instead of four independent reduce() traversals.
  const bucket = (rows, type) => {
    let sales = 0
    let delivery = 0
    for (const order of rows) {
      sales += order.orderAmount || 0
      delivery += order.deliveryCharges || 0
    }
    return {
      _type: type,
      data: {
        total_orders: rows.length,
        total_sales: Number(sales.toFixed(2)),
        total_sales_without_delivery: Number((sales - delivery).toFixed(2)),
        total_delivery_fee: Number(delivery.toFixed(2))
      }
    }
  }

  const methodBuckets = (rows) => [
    bucket(rows, 'all'),
    bucket(rows.filter((o) => o.isPickedUp), 'isPickedUp'),
    bucket(rows.filter((o) => !o.isPickedUp), 'isNotPickedUp')
  ]

  // One traversal splits the orders into every bucket the report needs
  // (previously eight separate .filter() passes over the same array).
  const cod = []
  const card = []
  const pickup = []
  const delivery = []
  let pickupSales = 0
  let deliverySales = 0

  for (const order of orders) {
    if ((order.paymentMethod || 'COD').toUpperCase() === 'COD') cod.push(order)
    else card.push(order)

    if (order.isPickedUp) {
      pickup.push(order)
      pickupSales += order.orderAmount || 0
    } else {
      delivery.push(order)
      deliverySales += order.orderAmount || 0
    }
  }

  const allTotals = bucket(orders, 'all').data

  return {
    ...allTotals,
    pickup_total_orders: pickup.length,
    delivery_total_orders: delivery.length,
    pickup_orders: Number(pickupSales.toFixed(2)),
    delivery_orders: Number(deliverySales.toFixed(2)),
    pickup: { total_orders: pickup.length },
    delivery: { total_orders: delivery.length },
    all: methodBuckets(orders),
    cod: methodBuckets(cod),
    card: methodBuckets(card)
  }
}

// ---------------------------------------------------------------------------
// vendorShape — optimised: all restaurants fetched once outside the loop
// ---------------------------------------------------------------------------

export async function vendorShape(owner, restaurantsByOwner) {
  // restaurantsByOwner is a Map<ownerId, Restaurant[]> pre-built by the
  // vendors query to avoid N+1 DB round-trips.
  const rows = restaurantsByOwner
    ? (restaurantsByOwner.get(String(owner._id)) || [])
    : await Restaurant.find({ ownerId: owner._id }).lean()

  const [firstName, ...rest] = (owner.name || '').split(' ')
  return {
    _id: id(owner),
    unique_id: id(owner),
    email: owner.email,
    userType: 'RESTAURANT',
    isActive: owner.isActive !== false,
    name: owner.name,
    image: '',
    firstName: firstName || '',
    lastName: rest.join(' '),
    phoneNumber: owner.phone || '',
    restaurants: await Promise.all(rows.map((r) => buildRestaurantTree(r)))
  }
}

// ---------------------------------------------------------------------------
// Query resolvers
// ---------------------------------------------------------------------------

export const queries = {
  ...authQueries,

  restaurants: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return listRestaurants()
  },

  restaurantsPaginated: async (_p, { page = 1, limit = 10, search }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const filter = search ? { name: containsFilter(search) } : {}
    const safePage = Math.max(1, clampNonNegative(page, 1))
    const safeLimit = clampPageSize(limit, 10)
    const totalCount = await Restaurant.countDocuments(filter)
    const rows = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
    return {
      data: rows.map((r) => ({ ...r, _id: id(r) })),
      totalCount,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
    }
  },

  getClonedRestaurantsPaginated: async (_p, { page = 1, limit = 10 }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return { data: [], totalCount: 0, currentPage: page || 1, totalPages: 1 }
  },

  // Fixed: was N+1 (one Food.find per category). Now batches all foods in one query.
  categories: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const filter = restaurantId ? { restaurantId } : {}
    const cats = await Category.find(filter).lean()
    if (!cats.length) return []

    const catIds = cats.map((c) => c._id)
    const allFoods = await Food.find({ categoryId: { $in: catIds } }).lean()
    const foodsByCategory = new Map()
    for (const food of allFoods) {
      const key = String(food.categoryId)
      if (!foodsByCategory.has(key)) foodsByCategory.set(key, [])
      foodsByCategory.get(key).push(food)
    }

    return cats.map((c) => ({
      _id: id(c),
      title: c.title,
      restaurantId: id(c.restaurantId),
      foods: (foodsByCategory.get(String(c._id)) || []).map(mapFood)
    }))
  },

  restaurantCategoriesPaginated: async (
    _p,
    { restaurantId, page = 1, limit = 10, search },
    ctx
  ) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const safePage = Math.max(1, clampNonNegative(page, 1))
    const safeLimit = clampPageSize(limit, 10)
    const filter = { restaurantId }
    if (search) filter.title = containsFilter(search)
    const totalCount = await Category.countDocuments(filter)
    const rows = await Category.find(filter)
      .sort({ createdAt: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
    return {
      data: rows.map((c) => ({
        _id: id(c),
        title: c.title,
        image: c.image || '',
        restaurantId: id(c.restaurantId),
        foods: []
      })),
      totalCount,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
    }
  },

  food: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const foods = await Food.find({ restaurantId }).lean()
    return foods.map(mapFood)
  },

  configuration: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return CONFIG
  },

  nearByRestaurants: async (_p, { shopType, latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ shopType, latitude, longitude })
    return {
      offers: [],
      sections: [{ _id: 'jedzto-section-all', name: 'W okolicy', restaurants: restaurants.map((r) => r._id) }],
      restaurants
    }
  },

  nearByRestaurantsPreview: async (_p, { shopType, latitude, longitude, page = 1, limit = 50 }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ shopType, latitude, longitude })
    const start = Math.max(0, (page - 1) * limit)
    return {
      offers: [],
      sections: [{ _id: 'jedzto-section-all', name: 'W okolicy', restaurants: restaurants.map((r) => r._id) }],
      restaurants: restaurants.slice(start, start + limit).map(toPreview)
    }
  },

  restaurant: async (_p, { id: restaurantId, latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const r = await Restaurant.findById(restaurantId).lean()
    if (!r) return null
    return buildRestaurantTree(r, {
      audience: audienceFor(ctx, r),
      latitude,
      longitude
    })
  },

  cuisines: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await Restaurant.find({ isActive: true })
      .select('cuisines image')
      .lean()
    const names = [...new Set(restaurants.flatMap((r) => r.cuisines || []))]
    return names.map((name, i) => ({
      _id: `c-${i}`,
      name,
      description: name,
      image: restaurants[0]?.image || '',
      shopType: 'restaurant'
    }))
  },

  banners: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return [
      {
        _id: 'jedzto-banner-1',
        title: 'JedzTo Myślenice',
        description: 'Lokalne smaki z dostawą',
        action: 'navigate',
        screen: 'Menu',
        file: '',
        parameters: null
      }
    ]
  },

  zones: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return [
      {
        _id: 'jedzto-zone-myslenice',
        title: 'Myślenice',
        description: 'Strefa dostaw',
        location: {
          coordinates: [[[19.8, 49.8], [20.0, 49.8], [20.0, 49.9], [19.8, 49.9], [19.8, 49.8]]]
        },
        isActive: true,
        tax: 8
      }
    ]
  },

  tips: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return { _id: 'tips', tipVariations: [0, 2, 5, 10], enabled: true }
  },

  taxes: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return { _id: 'taxes', taxationCharges: 8, enabled: true }
  },

  orders: async (_p, { offset = 0 }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const rows = await Order.find({ customerId: auth.userId })
      .sort({ createdAt: -1 })
      .skip(clampNonNegative(offset))
      // Was unbounded: a long-standing customer could pull their whole history
      // (and 2 extra queries per order) in a single request.
      .limit(MAX_ORDER_PAGE_SIZE)
      .lean()
    return serializeOrders(rows)
  },

  // Order ids are short and guessable, so ownership — not just authentication —
  // decides access. Previously any logged-in user could read any order,
  // including the customer's name, phone and delivery address.
  order: async (_p, { id: orderId }, ctx) => {
    assertPublicAccess(ctx)
    const { order } = await loadAuthorizedOrder(ctx, orderId, { lean: true })
    return serializeOrder(order)
  },

  getUsersActiveOrders: async (_p, { offset = 0, limit = 20 }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const rows = await Order.find({
      customerId: auth.userId,
      orderStatus: { $in: [...ACTIVE] }
    })
      .sort({ createdAt: -1 })
      .skip(clampNonNegative(offset))
      .limit(clampPageSize(limit, 20))
      .lean()
    return serializeOrders(rows)
  },

  getUsersPastOrders: async (_p, { offset = 0, limit = 20 }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const rows = await Order.find({
      customerId: auth.userId,
      orderStatus: { $nin: [...ACTIVE] }
    })
      .sort({ createdAt: -1 })
      .skip(clampNonNegative(offset))
      .limit(clampPageSize(limit, 20))
      .lean()
    return serializeOrders(rows)
  },

  topRatedVendors: async (_p, { latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    return listRestaurants({ latitude, longitude })
  },

  topRatedVendorsPreview: async (_p, { latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ latitude, longitude })
    return restaurants.map(toPreview)
  },

  // Deduped: getRecentOrderRestaurants and recentOrderRestaurantsPreview do the same thing.
  getRecentOrderRestaurants: async (_p, { latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ latitude, longitude })
    return restaurants.slice(0, 3).map(toPreview)
  },
  recentOrderRestaurantsPreview: async (_p, { latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ latitude, longitude })
    return restaurants.slice(0, 3).map(toPreview)
  },

  getMostOrderedRestaurants: async (_p, { shopType, latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ shopType, latitude, longitude })
    return restaurants.map(toPreview)
  },

  mostOrderedRestaurantsPreview: async (_p, { shopType, latitude, longitude, page = 1, limit = 15 }, ctx) => {
    assertPublicAccess(ctx)
    const restaurants = await listRestaurants({ shopType, latitude, longitude })
    const start = Math.max(0, (page - 1) * limit)
    return restaurants.slice(start, start + limit).map(toPreview)
  },

  // Single resolver for user favourites (UserFavourite was a duplicate alias).
  userFavourite: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId).lean()
    const restaurants = await Restaurant.find({ _id: { $in: user?.favourite || [] } }).lean()
    return restaurants.map(toPreview)
  },
  // Legacy alias — resolves to the same data.
  UserFavourite: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId).lean()
    const restaurants = await Restaurant.find({ _id: { $in: user?.favourite || [] } }).lean()
    return restaurants.map(toPreview)
  },

  popularItems: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const foods = await Food.find({ restaurantId }).limit(5).lean()
    return foods.map((f, i) => ({ id: id(f), count: 20 - i }))
  },

  popularFoodItems: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const foods = await Food.find({ restaurantId }).limit(8).lean()
    return foods.map(mapFood)
  },

  relatedItems: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const foods = await Food.find({ restaurantId }).limit(6).lean()
    return foods.map(mapFood)
  },

  getVersions: () => ({
    customerAppVersion: { android: '1.0.0', ios: '1.0.0' },
    riderAppVersion: { android: '1.0.0', ios: '1.0.0' },
    restaurantAppVersion: { android: '1.0.0', ios: '1.0.0' }
  }),

  fetchAllShopTypes: async () => {
    const shopTypes = await ShopType.find({ isActive: true }).sort({ name: 1 }).lean()
    return {
      data: shopTypes.map((st) => ({
        _id: st._id,
        image: st.image || '',
        name: st.name,
        slug: st._id,
        isActive: st.isActive
      }))
    }
  },

  fetchShopTypes: async (_p, { filter, pagination } = {}) => {
    const query = {}
    if (filter?.isActive !== undefined && filter?.isActive !== null) {
      query.isActive = filter.isActive
    }
    if (filter?.search) {
      query.name = containsFilter(filter.search)
    }
    const page = Math.max(1, clampNonNegative(pagination?.page, 1))
    const pageSize = clampPageSize(pagination?.limit, 50)
    const total = await ShopType.countDocuments(query)
    const rows = await ShopType.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return {
      data: rows.map((st) => ({ ...st, slug: st._id })),
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  },

  fetchShopTypeByUnique: async (_p, { dto }) => {
    if (!dto) return null
    const query = {}
    if (dto._id) query._id = dto._id
    else if (dto.slug) query._id = dto.slug
    else if (dto.name) query.name = dto.name
    if (!Object.keys(query).length) return null
    const shopType = await ShopType.findOne(query).lean()
    return shopType ? { ...shopType, slug: shopType._id } : null
  },

  subCategories: () => [],
  subCategoriesByParentId: () => [],

  getCountryByIso: () => ({
    cities: [
      { id: 'myslenice', name: 'Myślenice', latitude: 49.8339, longitude: 19.9381 },
      { id: 'sulkowice', name: 'Sułkowice', latitude: 49.8408, longitude: 19.8011 }
    ]
  }),

  rider: (_p, { id: riderId }) => ({
    _id: riderId || 'jedzto-rider-1',
    name: 'Kurier Demo',
    phone: '+48111000000',
    location: { coordinates: [19.9381, 49.8339] }
  }),

  chat: () => [],
  GetReviewsByRestaurant: () => ({ total: 0, ratings: 0, reviews: [] }),

  myRestaurants: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const filter = auth.role === 'SUPER_ADMIN' ? {} : { ownerId: auth.userId }
    const rows = await Restaurant.find(filter).lean()
    return Promise.all(rows.map(buildRestaurantTree))
  },

  restaurantOrders: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    if (
      auth.role === 'RESTAURANT_OWNER' &&
      String(restaurant.ownerId) !== String(auth.userId)
    ) {
      throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
    }
    const rows = await Order.find(kitchenOrdersMongoFilter(restaurant._id))
      .sort({ createdAt: -1 })
      .limit(MAX_ORDER_PAGE_SIZE)
      .lean()
    return serializeOrders(rows)
  },

  ordersByRestId: async (_p, { restaurant, page = 1, rows = 10, search, orderStatus }, ctx) => {
    assertPublicAccess(ctx)
    await assertCanReadRestaurantOrders(ctx, restaurant)
    return paginateOrders(
      {
        restaurantId: restaurant,
        ...orderStatusFilter(orderStatus),
        ...(await orderSearchFilter(search))
      },
      { page, rows }
    )
  },

  ordersByRestIdWithoutPagination: async (_p, { restaurant, search }, ctx) => {
    assertPublicAccess(ctx)
    await assertCanReadRestaurantOrders(ctx, restaurant)
    const docs = await Order.find({
      restaurantId: restaurant,
      ...(await orderSearchFilter(search))
    })
      .sort({ createdAt: -1 })
      .limit(MAX_ORDER_PAGE_SIZE)
      .lean()
    return serializeOrders(docs)
  },

  allOrders: async (_p, { page = 1 }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const { orders } = await paginateOrders({}, { page, rows: 20 })
    return orders
  },

  allOrdersPaginated: async (
    _p,
    { page = 1, rows = 10, dateKeyword, starting_date, ending_date, orderStatus, search },
    ctx
  ) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return paginateOrders(
      {
        ...orderStatusFilter(orderStatus),
        ...statsDateRange({ startingDate: starting_date, endingDate: ending_date, dateKeyword }),
        ...(await orderSearchFilter(search))
      },
      { page, rows }
    )
  },

  allOrdersWithoutPagination: async (_p, { dateKeyword, starting_date, ending_date }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const docs = await Order.find(
      statsDateRange({ startingDate: starting_date, endingDate: ending_date, dateKeyword })
    )
      .sort({ createdAt: -1 })
      .limit(MAX_ORDER_PAGE_SIZE)
      .lean()
    return serializeOrders(docs)
  },

  getActiveOrders: async (_p, { restaurantId, page = 1, rowsPerPage = 10, search }, ctx) => {
    assertPublicAccess(ctx)
    if (restaurantId) {
      await assertCanReadRestaurantOrders(ctx, restaurantId)
    } else {
      requireUser(ctx, ['SUPER_ADMIN'])
    }
    const filter = {
      orderStatus: { $in: [...ACTIVE] },
      ...(restaurantId ? { restaurantId } : {}),
      ...(await orderSearchFilter(search))
    }
    const { orders, totalCount } = await paginateOrders(filter, { page, rows: rowsPerPage })
    return { orders, totalCount }
  },

  getRestaurantDeliveryZoneInfo: async (_p, { id: restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const restaurant = await Restaurant.findById(restaurantId).lean()
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    const widest = (restaurant.deliveryAreas || []).reduce(
      (max, a) => Math.max(max, a.radiusKm || 0),
      0
    )
    return {
      boundType: 'radius',
      deliveryBounds: { coordinates: [] },
      location: restaurant.location,
      circleBounds: { radius: (widest || 3) * 1000 },
      address: restaurant.address,
      city: restaurant.zone?.title || '',
      postCode: ''
    }
  },

  restaurantByOwner: async (_p, { id: ownerId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const targetId = ownerId || auth.userId
    if (auth.role !== 'SUPER_ADMIN' && String(targetId) !== String(auth.userId)) {
      throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
    }
    const owner = await User.findById(targetId).lean()
    if (!owner) throw new GraphQLError('Owner not found')
    const rows = await Restaurant.find({ ownerId: owner._id }).lean()
    return {
      _id: id(owner),
      email: owner.email,
      userType: 'RESTAURANT',
      restaurants: await Promise.all(rows.map((r) => buildRestaurantTree(r)))
    }
  },

  // ---- Super Admin: people -----------------------------------------------
  users: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const rows = await User.find({ role: 'CUSTOMER' }).sort({ createdAt: -1 }).lean()
    return rows.map(adminUserShape)
  },

  usersPaginated: async (_p, { page = 1, limit = 10, search, status }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const safePage = Math.max(1, clampNonNegative(page, 1))
    const safeLimit = clampPageSize(limit, 10)
    const filter = { role: 'CUSTOMER' }
    if (search) {
      const rx = containsFilter(search)
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
    }
    if (status === 'active') filter.isActive = true
    if (status === 'inactive') filter.isActive = false
    const totalCount = await User.countDocuments(filter)
    const rows = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
    return {
      data: rows.map(adminUserShape),
      totalCount,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
    }
  },

  // Fixed: was N+1 (Restaurant.find per owner + buildRestaurantTree per restaurant).
  // Now fetches all restaurants once and groups by ownerId in memory.
  vendors: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const owners = await User.find({ role: 'RESTAURANT_OWNER' }).sort({ createdAt: -1 }).lean()
    if (!owners.length) return []

    const ownerIds = owners.map((o) => o._id)
    const allRestaurants = await Restaurant.find({ ownerId: { $in: ownerIds } }).lean()
    const restaurantsByOwner = new Map()
    for (const r of allRestaurants) {
      const key = String(r.ownerId)
      if (!restaurantsByOwner.has(key)) restaurantsByOwner.set(key, [])
      restaurantsByOwner.get(key).push(r)
    }
    return Promise.all(owners.map((o) => vendorShape(o, restaurantsByOwner)))
  },

  getVendor: async (_p, { id: vendorId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    if (auth.role !== 'SUPER_ADMIN' && String(vendorId) !== String(auth.userId)) {
      throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
    }
    const owner = await User.findById(vendorId).lean()
    return owner ? vendorShape(owner) : null
  },

  subCategory: (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    return null
  },

  deliveryQuote: async (_p, { restaurantId, latitude, longitude }, ctx) => {
    assertPublicAccess(ctx)
    const restaurant = await Restaurant.findById(restaurantId).lean()
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    return resolveDelivery(restaurant, latitude, longitude)
  },

  menuPublishStatus: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const restaurant = await Restaurant.findById(restaurantId).lean()
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    return menuPublishStatusOf(restaurant)
  },

  restaurantSettlements: async (_p, { periodKey }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const key = periodKey || currentPeriodKey()
    const rows = await listSettlementsForPeriod(key)
    return rows.map((row) => ({
      ...row,
      periodStart: row.periodStart?.toISOString?.() || row.periodStart,
      periodEnd: row.periodEnd?.toISOString?.() || row.periodEnd,
      settledAt: row.settledAt ? new Date(row.settledAt).toISOString() : null
    }))
  },

  restaurantSettlement: async (_p, { restaurantId, periodKey }, ctx) => {
    assertPublicAccess(ctx)
    // Financial data: an owner may only read their own restaurant's settlement
    // (the role check alone let any owner pass any restaurantId).
    requireRestaurantOwner(ctx, restaurantId)
    const key = periodKey || currentPeriodKey()
    const row = await upsertSettlementPreview(restaurantId, key)
    if (!row) throw new GraphQLError('Restaurant not found')
    return {
      ...row,
      periodStart: row.periodStart?.toISOString?.() || row.periodStart,
      periodEnd: row.periodEnd?.toISOString?.() || row.periodEnd,
      settledAt: row.settledAt ? new Date(row.settledAt).toISOString() : null
    }
  },

  restaurantSalesReport: async (_p, { restaurantId, from, to }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 864e5)
    const toDate = to ? new Date(to) : new Date()
    const orders = await Order.find({
      restaurantId,
      createdAt: { $gte: fromDate, $lte: toDate },
      orderStatus: { $nin: ['CANCELLED', 'REJECTED'] },
      paymentStatus: { $ne: 'REFUNDED' }
    })
      .select('orderAmount paymentMethod createdAt items.title items.quantity')
      .lean()

    let onlineGross = 0
    let cashGross = 0
    const byWeekday = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday],
      gross: 0,
      orderCount: 0
    }))
    const itemMap = new Map()

    for (const o of orders) {
      const amount = Number(o.orderAmount || 0)
      const isCash = String(o.paymentMethod || 'COD').toUpperCase() === 'COD'
      if (isCash) cashGross += amount
      else onlineGross += amount
      const wd = new Date(o.createdAt).getDay()
      byWeekday[wd].gross += amount
      byWeekday[wd].orderCount += 1
      for (const item of o.items || []) {
        const key = item.title || 'Item'
        const prev = itemMap.get(key) || { id: key, title: key, count: 0 }
        prev.count += Number(item.quantity || 1)
        itemMap.set(key, prev)
      }
    }

    const topItems = [...itemMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)

    return {
      restaurantId: String(restaurantId),
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totalGross: Math.round((onlineGross + cashGross) * 100) / 100,
      onlineGross: Math.round(onlineGross * 100) / 100,
      cashGross: Math.round(cashGross * 100) / 100,
      orderCount: orders.length,
      topItems,
      byWeekday: byWeekday.map((w) => ({ ...w, gross: Math.round(w.gross * 100) / 100 }))
    }
  },

  getDashboardUsers: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return dashboardCounts()
  },

  getDashboardUsersByYear: async (_p, { year }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return dashboardCounts(year)
  },

  getDashboardOrdersByType: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return ordersGroupedByRestaurant('count')
  },

  getDashboardSalesByType: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    return ordersGroupedByRestaurant('sales')
  },

  getRestaurantDashboardSalesOrderCountDetailsByYear: async (
    _p,
    { restaurant, year },
    ctx
  ) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurant)
    return monthlySalesAndOrders(restaurant, year)
  },

  getRestaurantDashboardOrderSalesDetailsByPaymentMethod: async (
    _p,
    { restaurant, starting_date, ending_date, dateKeyword },
    ctx
  ) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurant)
    return paymentMethodStats(restaurant, {
      startingDate: starting_date,
      endingDate: ending_date,
      dateKeyword
    })
  },

  coupons: async (_p, _args, ctx) => coupons(ctx),
  couponsPaginated: async (_p, args, ctx) => couponsPaginated(ctx, args)
}
