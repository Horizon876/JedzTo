import { PubSub, withFilter } from 'graphql-subscriptions'
import { GraphQLError } from 'graphql'
import { User, Restaurant, Category, Food, Order, ShopType } from '../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  requireRestaurantOwner,
  signPublicToken,
  signUserToken
} from '../auth/jwt.js'
import { generateTemporaryPassword } from '../utils/password.js'
import { saveBase64Image } from '../utils/imageUpload.js'

export const pubsub = new PubSub()
const ORDER_STATUS = 'ORDER_STATUS'
const ORDER_CHANGED = 'ORDER_CHANGED'
const RIDER_LOCATION = 'RIDER_LOCATION'
const CHAT_MESSAGE = 'CHAT_MESSAGE'

const ACTIVE = new Set(['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'PREPARING'])
const TEST_OTP = '123456'

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
  testOtp: TEST_OTP,
  skipMobileVerification: true,
  skipEmailVerification: true,
  costType: 'fixed',
  publishableKey: '',
  secretKey: '',
  googlePlacesApiBaseUrl: 'https://maps.googleapis.com/maps/api',
  riderAppSentryUrl: ''
}

const id = (doc) => (doc?._id ? String(doc._id) : null)

const toPreview = (r) => ({
  _id: id(r),
  name: r.name,
  image: r.image,
  logo: r.logo,
  deliveryTime: r.deliveryTime,
  minimumOrder: r.minimumOrder,
  isAvailable: r.isAvailable,
  tax: r.tax,
  shopType: r.shopType,
  cuisines: r.cuisines,
  tags: r.tags,
  reviewCount: r.reviewCount,
  reviewAverage: r.reviewAverage,
  freeDelivery: r.freeDelivery,
  acceptVouchers: r.acceptVouchers,
  location: r.location,
  openingTimes: r.openingTimes
})

const mapFood = (f) => ({
  _id: id(f),
  title: f.title,
  description: f.description,
  image: f.image,
  price: f.price,
  subCategory: f.subCategory,
  isOutOfStock: f.isOutOfStock,
  isActive: f.isActive,
  restaurantId: id(f.restaurantId) || String(f.restaurantId),
  categoryId: id(f.categoryId) || String(f.categoryId),
  createdAt: f.createdAt?.toISOString?.() || f.createdAt,
  updatedAt: f.updatedAt?.toISOString?.() || f.updatedAt,
  variations: (f.variations || []).map((v) => ({
    _id: id(v) || String(v._id),
    id: id(v) || String(v._id),
    title: v.title,
    price: v.price,
    discounted: v.discounted || 0,
    addons: v.addons || [],
    isOutOfStock: Boolean(v.isOutOfStock)
  }))
})

const slugify = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

async function buildRestaurantTree(restaurant) {
  if (!restaurant) return null
  const categories = await Category.find({ restaurantId: restaurant._id }).lean()
  const foods = await Food.find({ restaurantId: restaurant._id }).lean()
  const foodsByCat = new Map()
  for (const f of foods) {
    const key = String(f.categoryId)
    if (!foodsByCat.has(key)) foodsByCat.set(key, [])
    foodsByCat.get(key).push(mapFood(f))
  }

  return {
    ...restaurant,
    _id: id(restaurant),
    orderId: id(restaurant),
    ownerId: id(restaurant.ownerId) || String(restaurant.ownerId),
    reviewData: {
      total: restaurant.reviewCount || 0,
      ratings: restaurant.reviewAverage || 0,
      reviews: []
    },
    options: restaurant.options || [],
    addons: restaurant.addons || [],
    categories: categories.map((c) => ({
      _id: id(c),
      title: c.title,
      image: c.image || '',
      restaurantId: id(c.restaurantId),
      foods: foodsByCat.get(String(c._id)) || [],
      createdAt: c.createdAt?.toISOString?.() || c.createdAt,
      updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt
    }))
  }
}

async function buildRestaurantTreeById(restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).lean()
  if (!restaurant) throw new GraphQLError('Restaurant not found')
  return buildRestaurantTree(restaurant)
}

async function listRestaurants({ shopType } = {}) {
  const filter = { isActive: true }
  if (shopType) filter.shopType = shopType
  const rows = await Restaurant.find(filter).lean()
  return Promise.all(rows.map(buildRestaurantTree))
}

const authResponse = (user, isNewUser = false) => {
  const { token, tokenExpiration } = signUserToken(user)
  return {
    userId: id(user),
    token,
    tokenExpiration,
    isActive: user.isActive,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isNewUser
  }
}

const mapUserType = (role) => {
  if (role === 'SUPER_ADMIN') return 'ADMIN'
  if (role === 'RESTAURANT_OWNER') return 'VENDOR'
  return 'CUSTOMER'
}

async function ownerResponse(user) {
  const tokens = signUserToken(user)
  const filter =
    user.role === 'SUPER_ADMIN' ? {} : { ownerId: user._id }
  const restaurants = await Restaurant.find(filter).lean()
  return {
    userId: id(user),
    token: tokens.token,
    tokenExpiration: tokens.tokenExpiration,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiration: tokens.refreshTokenExpiration,
    email: user.email,
    userType: mapUserType(user.role),
    userTypeId: id(user),
    permissions: user.role === 'SUPER_ADMIN' ? ['*'] : ['restaurant'],
    image: null,
    name: user.name,
    isActive: user.isActive !== false,
    restaurantId: user.restaurantId ? String(user.restaurantId) : null,
    restaurants: restaurants.map((r) => ({
      _id: id(r),
      orderId: id(r),
      name: r.name,
      image: r.image,
      address: r.address
    }))
  }
}

const profileShape = (user) => ({
  _id: id(user),
  name: user.name,
  phone: user.phone,
  phoneIsVerified: user.phoneIsVerified,
  email: user.email,
  emailIsVerified: user.emailIsVerified,
  notificationToken: user.notificationToken,
  isActive: user.isActive,
  isOrderNotification: user.isOrderNotification,
  isOfferNotification: user.isOfferNotification,
  role: user.role,
  favourite: (user.favourite || []).map(String),
  addresses: (user.addresses || []).map((a) => ({
    _id: id(a) || String(a._id),
    id: id(a) || String(a._id),
    label: a.label,
    deliveryAddress: a.deliveryAddress,
    details: a.details,
    location: a.location,
    selected: a.selected
  }))
})

async function serializeOrder(order) {
  const restaurant = await Restaurant.findById(order.restaurantId).lean()
  const user = await User.findById(order.customerId).lean()
  const iso = (d) => (d ? new Date(d).toISOString() : null)

  return {
    ...order,
    _id: id(order),
    id: id(order),
    restaurantId: id(order.restaurantId),
    restaurant: restaurant
      ? {
          _id: id(restaurant),
          name: restaurant.name,
          image: restaurant.image,
          address: restaurant.address,
          location: restaurant.location
        }
      : null,
    user: user
      ? { _id: id(user), name: user.name, phone: user.phone, email: user.email }
      : null,
    deliveryAddress: {
      ...order.deliveryAddress,
      id: id(order.deliveryAddress) || 'addr'
    },
    items: (order.items || []).map((item) => ({
      ...item,
      _id: id(item),
      id: id(item),
      food: String(item.food || ''),
      variation: item.variation
        ? {
            ...item.variation,
            _id: String(item.variation._id || ''),
            id: String(item.variation._id || '')
          }
        : null,
      addons: []
    })),
    createdAt: iso(order.createdAt),
    orderDate: iso(order.orderDate),
    expectedTime: iso(order.expectedTime),
    preparationTime: iso(order.preparationTime),
    completionTime: iso(order.completionTime),
    acceptedAt: iso(order.acceptedAt),
    pickedAt: iso(order.pickedAt),
    deliveredAt: iso(order.deliveredAt),
    cancelledAt: iso(order.cancelledAt),
    assignedAt: iso(order.assignedAt)
  }
}

function scheduleOrderProgress(orderId, userId) {
  const steps = [
    { delay: 4000, status: 'ACCEPTED', field: 'acceptedAt' },
    { delay: 10000, status: 'ASSIGNED', field: 'assignedAt' },
    { delay: 18000, status: 'PICKED', field: 'pickedAt' },
    { delay: 28000, status: 'DELIVERED', field: 'deliveredAt' }
  ]
  for (const step of steps) {
    setTimeout(async () => {
      try {
        const patch = {
          orderStatus: step.status,
          [step.field]: new Date()
        }
        if (step.status === 'ACCEPTED') {
          patch.preparationTime = new Date(Date.now() + 20 * 60 * 1000)
        }
        if (step.status === 'DELIVERED') {
          patch.completionTime = new Date()
          patch.paymentStatus = 'PAID'
        }
        const updated = await Order.findByIdAndUpdate(orderId, patch, { new: true }).lean()
        if (!updated) return
        const serialized = await serializeOrder(updated)
        pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
        pubsub.publish(ORDER_CHANGED, {
          orderStatusChanged: {
            userId: String(userId),
            origin: 'local-api',
            order: serialized
          }
        })
      } catch (err) {
        console.error('[order progress]', err.message)
      }
    }, step.delay)
  }
}

export const resolvers = {
  Query: {
    restaurants: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      return listRestaurants()
    },
    // Super Admin "Stores" list (enatega-multivendor-admin) — paginated,
    // search-by-name/address, includes inactive restaurants so they can be
    // managed/reactivated.
    restaurantsPaginated: async (_p, { page = 1, limit = 10, search }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      const filter = search
        ? { name: { $regex: search, $options: 'i' } }
        : {}
      const safePage = Math.max(1, page || 1)
      const safeLimit = Math.max(1, limit || 10)
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
    // "Cloned" restaurants aren't a jedzto-local-api concept — always empty.
    getClonedRestaurantsPaginated: async (_p, { page = 1, limit = 10 }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      return { data: [], totalCount: 0, currentPage: page || 1, totalPages: 1 }
    },
    categories: async (_p, { restaurantId }, ctx) => {
      assertPublicAccess(ctx)
      const filter = restaurantId ? { restaurantId } : {}
      const cats = await Category.find(filter).lean()
      const result = []
      for (const c of cats) {
        const foods = await Food.find({ categoryId: c._id }).lean()
        result.push({
          _id: id(c),
          title: c.title,
          restaurantId: id(c.restaurantId),
          foods: foods.map(mapFood)
        })
      }
      return result
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
    nearByRestaurants: async (_p, { shopType }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType })
      return {
        offers: [],
        sections: [
          {
            _id: 'jedzto-section-all',
            name: 'W okolicy',
            restaurants: restaurants.map((r) => r._id)
          }
        ],
        restaurants
      }
    },
    nearByRestaurantsPreview: async (_p, { shopType, page = 1, limit = 50 }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType })
      const start = Math.max(0, (page - 1) * limit)
      return {
        offers: [],
        sections: [
          {
            _id: 'jedzto-section-all',
            name: 'W okolicy',
            restaurants: restaurants.map((r) => r._id)
          }
        ],
        restaurants: restaurants.slice(start, start + limit).map(toPreview)
      }
    },
    restaurant: async (_p, { id: restaurantId }, ctx) => {
      assertPublicAccess(ctx)
      const r = await Restaurant.findById(restaurantId).lean()
      return buildRestaurantTree(r)
    },
    cuisines: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await Restaurant.find({ isActive: true }).lean()
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
            coordinates: [
              [
                [19.8, 49.8],
                [20.0, 49.8],
                [20.0, 49.9],
                [19.8, 49.9],
                [19.8, 49.8]
              ]
            ]
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
    profile: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      if (!user) throw new GraphQLError('User not found')
      return profileShape(user)
    },
    orders: async (_p, { offset = 0 }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const rows = await Order.find({ customerId: auth.userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .lean()
      return Promise.all(rows.map(serializeOrder))
    },
    order: async (_p, { id: orderId }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx)
      const order =
        (await Order.findById(orderId).lean()) ||
        (await Order.findOne({ orderId }).lean())
      return order ? serializeOrder(order) : null
    },
    getUsersActiveOrders: async (_p, { offset = 0, limit = 20 }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const rows = await Order.find({
        customerId: auth.userId,
        orderStatus: { $in: [...ACTIVE] }
      })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
      return Promise.all(rows.map(serializeOrder))
    },
    getUsersPastOrders: async (_p, { offset = 0, limit = 20 }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const rows = await Order.find({
        customerId: auth.userId,
        orderStatus: { $nin: [...ACTIVE] }
      })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
      return Promise.all(rows.map(serializeOrder))
    },
    topRatedVendors: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      return listRestaurants()
    },
    topRatedVendorsPreview: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await Restaurant.find({ isActive: true }).lean()
      return restaurants.map(toPreview)
    },
    getRecentOrderRestaurants: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await Restaurant.find({ isActive: true }).limit(3).lean()
      return restaurants.map(toPreview)
    },
    getMostOrderedRestaurants: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await Restaurant.find({ isActive: true }).lean()
      return restaurants.map(toPreview)
    },
    recentOrderRestaurantsPreview: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await Restaurant.find({ isActive: true }).limit(3).lean()
      return restaurants.map(toPreview)
    },
    mostOrderedRestaurantsPreview: async (_p, { shopType, page = 1, limit = 15 }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType })
      const start = Math.max(0, (page - 1) * limit)
      return restaurants.slice(start, start + limit).map(toPreview)
    },
    UserFavourite: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId).lean()
      const restaurants = await Restaurant.find({
        _id: { $in: user?.favourite || [] }
      }).lean()
      return restaurants.map(toPreview)
    },
    userFavourite: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId).lean()
      const restaurants = await Restaurant.find({
        _id: { $in: user?.favourite || [] }
      }).lean()
      return Promise.all(restaurants.map(buildRestaurantTree))
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
        query.name = { $regex: filter.search, $options: 'i' }
      }
      const page = Math.max(1, pagination?.page || 1)
      const pageSize = Math.max(1, pagination?.limit || 50)
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
    ownerSession: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
      const user = await User.findById(auth.userId)
      if (!user) {
        throw new GraphQLError('UNAUTHENTICATED', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }
      return ownerResponse(user)
    },
    hasOwnerPermission: (_p, { permission }, ctx) => {
      assertPublicAccess(ctx)
      if (!ctx.user?.role) return false
      if (ctx.user.role === 'SUPER_ADMIN') return true
      if (ctx.user.role !== 'RESTAURANT_OWNER') return false
      // Restaurant owners are scoped to the "restaurant" permission group —
      // anything else (e.g. platform-level admin actions) is denied.
      return permission === 'restaurant'
    },
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
      const rows = await Order.find({ restaurantId }).sort({ createdAt: -1 }).lean()
      return Promise.all(rows.map(serializeOrder))
    }
  },

  Mutation: {
    metricsGeneral: (_p, _a, ctx) => {
      ctx.isPublicBootstrap = true
      const { token, expiry } = signPublicToken()
      return {
        excellence: 'local',
        topgun: 'jedzto',
        experience: token,
        skydiver: 'ok',
        rider: 'local',
        haha: 'jedzto',
        hehe: expiry,
        huhu: '1',
        yoyo: 'multi-vendor',
        turu: 'myslenice'
      }
    },
    ownerLogin: async (_p, { email, password }, ctx) => {
      assertPublicAccess(ctx)
      const user = await User.findOne({
        email: email.toLowerCase(),
        role: { $in: ['SUPER_ADMIN', 'RESTAURANT_OWNER'] }
      })
      if (!user || !(await user.comparePassword(password))) {
        throw new GraphQLError('Invalid email or password')
      }
      return ownerResponse(user)
    },
    login: async (_p, args, ctx) => {
      assertPublicAccess(ctx)
      const email = (args.email || '').toLowerCase()
      let user = await User.findOne({ email })

      if (args.type && args.type !== 'default' && args.type !== 'email') {
        if (!user) {
          user = await User.create({
            email: email || `${args.type}-${Date.now()}@jedzto.local`,
            name: args.name || 'Użytkownik JedzTo',
            password: `${Date.now()}`,
            role: 'CUSTOMER',
            emailIsVerified: true,
            phoneIsVerified: true
          })
          return authResponse(user, true)
        }
        return authResponse(user, false)
      }

      if (!user || !(await user.comparePassword(args.password || ''))) {
        throw new GraphQLError('Invalid email or password')
      }
      return authResponse(user, false)
    },
    createUser: async (_p, { userInput }, ctx) => {
      assertPublicAccess(ctx)
      if (userInput.email && (await User.findOne({ email: userInput.email.toLowerCase() }))) {
        throw new GraphQLError('Email already exists')
      }
      if (userInput.phone && (await User.findOne({ phone: userInput.phone }))) {
        throw new GraphQLError('Phone already exists')
      }
      const user = await User.create({
        name: userInput.name || 'Gość',
        email: (userInput.email || '').toLowerCase(),
        phone: userInput.phone || '',
        password: userInput.password || `${Date.now()}`,
        role: 'CUSTOMER',
        emailIsVerified: Boolean(userInput.emailIsVerified) || CONFIG.skipEmailVerification,
        phoneIsVerified: CONFIG.skipMobileVerification,
        notificationToken: userInput.notificationToken || null
      })
      return authResponse(user, true)
    },
    updateUser: async (_p, { updateUserInput }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findByIdAndUpdate(auth.userId, updateUserInput, {
        new: true
      })
      return profileShape(user)
    },
    emailExist: async (_p, { email }, ctx) => {
      assertPublicAccess(ctx)
      return Boolean(await User.findOne({ email: email.toLowerCase() }))
    },
    phoneExist: async (_p, { phone }, ctx) => {
      assertPublicAccess(ctx)
      return Boolean(await User.findOne({ phone }))
    },
    sendOtpToEmail: (_p, { email }, ctx) => {
      assertPublicAccess(ctx)
      console.log(`[OTP email ${email}] => ${TEST_OTP}`)
      return { result: true }
    },
    sendOtpToPhoneNumber: (_p, { phone }, ctx) => {
      assertPublicAccess(ctx)
      console.log(`[OTP phone ${phone}] => ${TEST_OTP}`)
      return { result: true }
    },
    verifyOtp: async (_p, { otp, email, phone }, ctx) => {
      const ok = otp === TEST_OTP
      if (ok && phone) {
        await User.findOneAndUpdate({ phone }, { phoneIsVerified: true })
      }
      if (ok && email) {
        await User.findOneAndUpdate(
          { email: email.toLowerCase() },
          { emailIsVerified: true }
        )
      }
      return { result: ok }
    },
    forgotPassword: (_p, { email }) => {
      console.log(`[Forgot password OTP ${email}] => ${TEST_OTP}`)
      return { result: true }
    },
    resetPassword: async (_p, { password, email, otp }) => {
      if (otp !== TEST_OTP) throw new GraphQLError('Invalid OTP')
      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) throw new GraphQLError('User not found')
      user.password = password
      await user.save()
      return { result: true }
    },
    placeOrder: async (_p, args, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const restaurant = await Restaurant.findById(args.restaurant)
      if (!restaurant) throw new GraphQLError('Restaurant not found')

      const items = []
      for (const line of args.orderInput || []) {
        const foodDoc = await Food.findById(line.food).lean()
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
          addons: []
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

      const order = await Order.create({
        orderId: `JT${Date.now().toString().slice(-8)}`,
        restaurantId: restaurant._id,
        customerId: auth.userId,
        items,
        paymentMethod: args.paymentMethod || 'COD',
        paidAmount: args.paymentMethod === 'COD' ? 0 : orderAmount,
        orderAmount,
        orderStatus: 'PENDING',
        paymentStatus: args.paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        tipping: args.tipping || 0,
        taxationAmount: args.taxationAmount || 0,
        deliveryCharges: args.deliveryCharges || 0,
        isPickedUp: Boolean(args.isPickedUp),
        instructions: args.instructions || '',
        orderDate: args.orderDate ? new Date(args.orderDate) : new Date(),
        expectedTime: new Date(Date.now() + 45 * 60 * 1000),
        deliveryAddress: {
          location: {
            coordinates: [
              args.address?.longitude || 19.9381,
              args.address?.latitude || 49.8339
            ]
          },
          deliveryAddress: args.address?.deliveryAddress || '',
          details: args.address?.details || '',
          label: args.address?.label || 'Other'
        }
      })

      const serialized = await serializeOrder(order.toObject())
      pubsub.publish(ORDER_CHANGED, {
        orderStatusChanged: {
          userId: String(auth.userId),
          origin: 'placeOrder',
          order: serialized
        }
      })
      scheduleOrderProgress(order._id, auth.userId)
      return serialized
    },
    createAddress: async (_p, { addressInput }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      user.addresses = (user.addresses || []).map((a) => {
        a.selected = false
        return a
      })
      user.addresses.push({
        label: addressInput.label || 'Other',
        deliveryAddress: addressInput.deliveryAddress || '',
        details: addressInput.details || '',
        location: {
          coordinates: [addressInput.longitude || 0, addressInput.latitude || 0]
        },
        selected: true
      })
      await user.save()
      return profileShape(user)
    },
    editAddress: async (_p, { addressInput }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      const addr = user.addresses.id(addressInput._id)
      if (addr) {
        if (addressInput.label != null) addr.label = addressInput.label
        if (addressInput.deliveryAddress != null) {
          addr.deliveryAddress = addressInput.deliveryAddress
        }
        if (addressInput.details != null) addr.details = addressInput.details
        if (addressInput.longitude != null || addressInput.latitude != null) {
          addr.location.coordinates = [
            addressInput.longitude ?? addr.location.coordinates[0],
            addressInput.latitude ?? addr.location.coordinates[1]
          ]
        }
      }
      await user.save()
      return profileShape(user)
    },
    deleteAddress: async (_p, { id: addressId }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      user.addresses = user.addresses.filter((a) => String(a._id) !== String(addressId))
      await user.save()
      return profileShape(user)
    },
    deleteBulkAddresses: async (_p, { ids }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const set = new Set(ids.map(String))
      const user = await User.findById(auth.userId)
      user.addresses = user.addresses.filter((a) => !set.has(String(a._id)))
      await user.save()
      return profileShape(user)
    },
    selectAddress: async (_p, { id: addressId }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      user.addresses.forEach((a) => {
        a.selected = String(a._id) === String(addressId)
      })
      await user.save()
      return profileShape(user)
    },
    changePassword: async (_p, { oldPassword, newPassword }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      if (!(await user.comparePassword(oldPassword))) {
        throw new GraphQLError('Invalid password')
      }
      user.password = newPassword
      await user.save()
      return true
    },
    pushToken: async (_p, { token }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findByIdAndUpdate(
        auth.userId,
        { notificationToken: token },
        { new: true }
      )
      return profileShape(user)
    },
    updateNotificationStatus: async (_p, args, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findByIdAndUpdate(
        auth.userId,
        {
          isOfferNotification: args.offerNotification,
          isOrderNotification: args.orderNotification
        },
        { new: true }
      )
      return profileShape(user)
    },
    addFavourite: async (_p, { id: restaurantId }, ctx) => {
      assertPublicAccess(ctx)
      const auth = requireUser(ctx)
      const user = await User.findById(auth.userId)
      const fav = new Set((user.favourite || []).map(String))
      if (fav.has(String(restaurantId))) fav.delete(String(restaurantId))
      else fav.add(String(restaurantId))
      user.favourite = [...fav]
      await user.save()
      return profileShape(user)
    },
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
      pubsub.publish(CHAT_MESSAGE, { subscriptionNewMessage: data, orderId })
      return { success: true, message: 'ok', data }
    },
    Deactivate: async (_p, { isActive, email }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isActive },
        { new: true }
      )
      if (!user) throw new GraphQLError('User not found')
      return profileShape(user)
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
      return serialized
    },

    // ---- Super Admin: restaurant onboarding -------------------------
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
          minimumOrder: restaurant.minimumOrder ?? 25,
          tax: restaurant.salesTax ?? 8,
          shopType: restaurant.shopType || 'restaurant',
          cuisines: restaurant.cuisines || []
        })
      } catch (err) {
        // Roll back the just-created owner account if the restaurant fails
        // to save, so we never leave an orphaned RESTAURANT_OWNER with no
        // restaurantId behind.
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

    // ---- Super Admin: shop types --------------------------------------
    createShopType: async (_p, { dto }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      if (!dto?.name) {
        throw new GraphQLError('name is required', { extensions: { code: 'BAD_USER_INPUT' } })
      }
      const baseId = slugify(dto.name) || 'shop-type'
      let id = baseId
      let suffix = 1
      while (await ShopType.exists({ _id: id })) {
        id = `${baseId}-${suffix}`
        suffix += 1
      }
      const shopType = await ShopType.create({
        _id: id,
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

    // ---- Vendor Panel: menu management -------------------------------
    createCategory: async (_p, { category }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, category.restaurant)
      await Category.create({
        restaurantId: category.restaurant,
        title: category.title,
        image: category.image || ''
      })
      return buildRestaurantTreeById(category.restaurant)
    },
    editCategory: async (_p, { category }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, category.restaurant)
      const existing = await Category.findById(category._id)
      if (!existing || String(existing.restaurantId) !== String(category.restaurant)) {
        throw new GraphQLError('Category not found')
      }
      if (category.title != null) existing.title = category.title
      if (category.image != null) existing.image = category.image
      await existing.save()
      return buildRestaurantTreeById(category.restaurant)
    },
    deleteCategory: async (_p, { id: categoryId, restaurant }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurant)
      const existing = await Category.findById(categoryId)
      if (!existing || String(existing.restaurantId) !== String(restaurant)) {
        throw new GraphQLError('Category not found')
      }
      await Food.deleteMany({ categoryId })
      await Category.deleteOne({ _id: categoryId })
      return buildRestaurantTreeById(restaurant)
    },
    createFood: async (_p, { foodInput }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, foodInput.restaurant)
      const category = await Category.findById(foodInput.category)
      if (!category || String(category.restaurantId) !== String(foodInput.restaurant)) {
        throw new GraphQLError('Category does not belong to this restaurant')
      }
      await Food.create({
        restaurantId: foodInput.restaurant,
        categoryId: foodInput.category,
        title: foodInput.title,
        description: foodInput.description || '',
        image: foodInput.image || '',
        subCategory: foodInput.subCategory || null,
        isOutOfStock: Boolean(foodInput.isOutOfStock),
        isActive: foodInput.isActive !== false,
        variations: (foodInput.variations || []).map((v) => ({
          title: v.title || 'Standard',
          price: v.price,
          discounted: v.discounted || 0,
          addons: v.addons || [],
          isOutOfStock: Boolean(v.isOutOfStock)
        }))
      })
      return buildRestaurantTreeById(foodInput.restaurant)
    },
    editFood: async (_p, { foodInput }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, foodInput.restaurant)
      const existing = await Food.findById(foodInput._id)
      if (!existing || String(existing.restaurantId) !== String(foodInput.restaurant)) {
        throw new GraphQLError('Food not found')
      }
      if (foodInput.category) {
        const category = await Category.findById(foodInput.category)
        if (!category || String(category.restaurantId) !== String(foodInput.restaurant)) {
          throw new GraphQLError('Category does not belong to this restaurant')
        }
        existing.categoryId = foodInput.category
      }
      if (foodInput.title != null) existing.title = foodInput.title
      if (foodInput.description != null) existing.description = foodInput.description
      if (foodInput.image != null) existing.image = foodInput.image
      if (foodInput.subCategory != null) existing.subCategory = foodInput.subCategory
      if (foodInput.isOutOfStock != null) existing.isOutOfStock = foodInput.isOutOfStock
      if (foodInput.isActive != null) existing.isActive = foodInput.isActive
      if (foodInput.variations) {
        existing.variations = foodInput.variations.map((v) => ({
          title: v.title || 'Standard',
          price: v.price,
          discounted: v.discounted || 0,
          addons: v.addons || [],
          isOutOfStock: Boolean(v.isOutOfStock)
        }))
      }
      await existing.save()
      return buildRestaurantTreeById(foodInput.restaurant)
    },
    deleteFood: async (_p, { id: foodId, restaurant }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurant)
      const existing = await Food.findById(foodId)
      if (!existing || String(existing.restaurantId) !== String(restaurant)) {
        throw new GraphQLError('Food not found')
      }
      await Food.deleteOne({ _id: foodId })
      return buildRestaurantTreeById(restaurant)
    },
    updateFoodOutOfStock: async (_p, { id: foodId, restaurant }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurant)
      const existing = await Food.findById(foodId)
      if (!existing || String(existing.restaurantId) !== String(restaurant)) {
        throw new GraphQLError('Food not found')
      }
      existing.isOutOfStock = !existing.isOutOfStock
      await existing.save()
      return existing.isOutOfStock
    },
    uploadImageToS3: async (_p, { image }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
      const imageUrl = await saveBase64Image(image, ctx.req)
      return { imageUrl }
    }
  },

  Restaurant: {
    owner: async (parent) => {
      if (!parent.ownerId) return null
      const owner = await User.findById(parent.ownerId).lean()
      if (!owner) return null
      return { _id: id(owner), email: owner.email, isActive: owner.isActive !== false }
    },
    slug: (parent) => slugify(parent.name || ''),
    username: async (parent) => {
      if (!parent.ownerId) return null
      const owner = await User.findById(parent.ownerId).lean()
      return owner?.email || null
    },
    commissionRate: () => 0,
    unique_restaurant_id: (parent) => parent._id
  },

  Subscription: {
    subscriptionOrder: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([ORDER_STATUS]),
        (payload, variables) =>
          payload.subscriptionOrder?._id === variables.id ||
          payload.subscriptionOrder?.orderId === variables.id
      )
    },
    subscriptionRiderLocation: {
      subscribe: () => pubsub.asyncIterator([RIDER_LOCATION])
    },
    orderStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([ORDER_CHANGED]),
        (payload, variables) =>
          payload.orderStatusChanged?.userId === variables.userId
      )
    },
    subscriptionNewMessage: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([CHAT_MESSAGE]),
        (payload, variables) => payload.orderId === variables.order
      )
    }
  }
}
