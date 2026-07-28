import { PubSub, withFilter } from 'graphql-subscriptions'
import { GraphQLError } from 'graphql'
import { User, Restaurant, Category, Food, Order, ShopType } from '../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  requireRestaurantOwner,
  signPublicToken,
  signUserToken,
  verifyToken
} from '../auth/jwt.js'
import { generateTemporaryPassword } from '../utils/password.js'
import { saveBase64Image } from '../utils/imageUpload.js'
import { liveCategories, mapFood, publishRestaurantMenu, rewriteUploadUrlsDeep } from '../services/menu.js'
import { rewriteUploadUrl } from '../utils/publicUrl.js'

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

const toCoord = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

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
  openingTimes: r.openingTimes,
  deliveryFee: r.deliveryFee ?? null,
  deliveryAreaName: r.deliveryAreaName ?? null,
  address: r.address ?? null
})

const slugify = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const EARTH_RADIUS_KM = 6371

// Great-circle distance in kilometres.
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Compares area names the way a person would: "Myślenice" and "Myslenice" are
// the same place, so the owner cannot accidentally price it twice.
const normalizeAreaName = (name) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')

const mapDeliveryArea = (a) => ({
  _id: id(a) || String(a._id),
  name: a.name,
  fee: a.fee ?? 0,
  minOrder: a.minOrder ?? 0,
  latitude: a.latitude,
  longitude: a.longitude,
  radiusKm: a.radiusKm ?? 3,
  isActive: a.isActive !== false
})

// Finds which of a restaurant's delivery areas covers the given coordinates.
// When several overlap, the tightest circle wins — a small "Myślenice centrum"
// area should beat a broad catch-all drawn around the whole county.
const matchDeliveryArea = (restaurant, latitude, longitude) => {
  const areas = (restaurant?.deliveryAreas || []).filter((a) => a.isActive !== false)
  if (!areas.length) return null
  const covering = areas
    .filter((a) => distanceKm(latitude, longitude, a.latitude, a.longitude) <= a.radiusKm)
    .sort((a, b) => a.radiusKm - b.radiusKm)
  return covering[0] || null
}

// Resolves deliverability for a restaurant at a location. A restaurant with no
// areas configured yet is treated as "delivers everywhere" so a freshly created
// store is not invisible before its owner sets things up.
const resolveDelivery = (restaurant, latitude, longitude) => {
  const areas = (restaurant?.deliveryAreas || []).filter((a) => a.isActive !== false)
  if (!areas.length) return { available: true, fee: null, minOrder: null, areaName: null }
  if (latitude == null || longitude == null) {
    return { available: true, fee: null, minOrder: null, areaName: null }
  }
  const area = matchDeliveryArea(restaurant, latitude, longitude)
  if (!area) return { available: false, fee: null, minOrder: null, areaName: null }
  return {
    available: true,
    fee: area.fee ?? 0,
    minOrder: area.minOrder ?? 0,
    areaName: area.name
  }
}

// Reads the menu the customer app should see. Owners edit the live
// Category/Food collections, but customers only get what was last published —
// a restaurant that has never published shows nothing rather than leaking a
// half-built draft.
// Admins and a restaurant's own owner are working on the menu, so they get the
// live version; every other caller is a customer and gets the published one.
const audienceFor = (ctx, restaurant) => {
  const user = ctx?.user
  if (!user?.userId) return 'customer'
  if (user.role === 'SUPER_ADMIN') return 'owner'
  if (
    user.role === 'RESTAURANT_OWNER' &&
    String(restaurant.ownerId) === String(user.userId)
  ) {
    return 'owner'
  }
  return 'customer'
}

function publishedCategories(restaurant) {
  const snapshot = restaurant?.publishedMenu
  if (!snapshot || !Array.isArray(snapshot.categories)) return []
  // Rewrite any localhost upload URLs baked into older snapshots so phones
  // can reach the developer's machine over LAN.
  return rewriteUploadUrlsDeep(snapshot.categories)
}

async function buildRestaurantTree(restaurant, { audience = 'owner', latitude, longitude } = {}) {
  if (!restaurant) return null

  const categories =
    audience === 'customer'
      ? publishedCategories(restaurant)
      : await liveCategories(restaurant._id)
  const delivery = resolveDelivery(restaurant, latitude, longitude)

  return {
    ...restaurant,
    _id: id(restaurant),
    orderId: id(restaurant),
    ownerId: id(restaurant.ownerId) || String(restaurant.ownerId),
    image: rewriteUploadUrl(restaurant.image),
    logo: rewriteUploadUrl(restaurant.logo),
    reviewData: {
      total: restaurant.reviewCount || 0,
      ratings: restaurant.reviewAverage || 0,
      reviews: []
    },
    options: restaurant.options || [],
    addons: restaurant.addons || [],
    deliveryAreas: (restaurant.deliveryAreas || []).map(mapDeliveryArea),
    deliveryFee: delivery.fee,
    deliveryAreaName: delivery.areaName,
    menuPublishedAt: restaurant.menuPublishedAt?.toISOString?.() || restaurant.menuPublishedAt || null,
    hasUnpublishedMenuChanges: Boolean(restaurant.hasUnpublishedMenuChanges),
    // Customers only see public company identifiers — never bank details.
    bussinessDetails:
      audience === 'customer'
        ? {
            companyRegNo: restaurant.bussinessDetails?.companyRegNo || null,
            bussinessRegNo: restaurant.bussinessDetails?.bussinessRegNo || null
          }
        : restaurant.bussinessDetails || null,
    categories
  }
}

async function buildRestaurantTreeById(restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).lean()
  if (!restaurant) throw new GraphQLError('Restaurant not found')
  return buildRestaurantTree(restaurant)
}

// Lists the restaurants a customer at (latitude, longitude) can actually order
// from: active, matching the shop type, and covering that address with one of
// their delivery areas.
async function listRestaurants({ shopType, latitude, longitude } = {}) {
  const filter = { isActive: true }
  if (shopType) filter.shopType = shopType
  const rows = await Restaurant.find(filter).lean()
  const deliverable = rows.filter(
    (r) => resolveDelivery(r, latitude, longitude).available
  )
  return Promise.all(
    deliverable.map((r) =>
      buildRestaurantTree(r, { audience: 'customer', latitude, longitude })
    )
  )
}

// Every menu edit puts the restaurant into a "needs publishing" state — the
// change only reaches customers once the owner hits "send to app".
async function menuChanged(restaurantId) {
  await Restaurant.updateOne(
    { _id: restaurantId },
    { $set: { hasUnpublishedMenuChanges: true } }
  )
  return buildRestaurantTreeById(restaurantId)
}

const menuPublishStatusOf = (restaurant) => {
  const categories = restaurant.publishedMenu?.categories || []
  return {
    restaurantId: id(restaurant),
    menuPublishedAt:
      restaurant.menuPublishedAt?.toISOString?.() || restaurant.menuPublishedAt || null,
    hasUnpublishedMenuChanges: Boolean(restaurant.hasUnpublishedMenuChanges),
    publishedCategories: categories.length,
    publishedItems: categories.reduce((sum, c) => sum + (c.foods?.length || 0), 0)
  }
}

// --- Dashboard statistics ---------------------------------------------------

const DELIVERED = 'DELIVERED'
const CANCELLED = new Set(['CANCELLED', 'REJECTED'])

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

// Platform-wide counts for the super admin home screen. When a year is given
// the counts cover that year and are compared against the previous one.
async function dashboardCounts(year) {
  const scope = (from, to) => (from ? { createdAt: { $gte: from, $lt: to } } : {})

  const countAll = async (range) => {
    const [users, owners, restaurants] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER', ...range }),
      User.countDocuments({ role: 'RESTAURANT_OWNER', ...range }),
      Restaurant.countDocuments({ ...range })
    ])
    return { usersCount: users, vendorsCount: owners, restaurantsCount: restaurants, ridersCount: 0 }
  }

  if (!year) {
    return { ...(await countAll({})), percentageChange: null }
  }

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

// Orders (or revenue) per restaurant, for the super admin's breakdown tables.
async function ordersGroupedByRestaurant(metric) {
  const [restaurants, orders] = await Promise.all([
    Restaurant.find().lean(),
    Order.find({ orderStatus: { $nin: [...CANCELLED] } }).lean()
  ])
  const names = new Map(restaurants.map((r) => [String(r._id), r.name]))
  const totals = new Map()

  for (const order of orders) {
    const key = String(order.restaurantId)
    const add = metric === 'sales' ? order.orderAmount || 0 : 1
    totals.set(key, (totals.get(key) || 0) + add)
  }

  return [...totals.entries()]
    .map(([restaurantId, value]) => ({
      label: names.get(restaurantId) || 'Nieznana restauracja',
      value: Number(value.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value)
}

// Twelve-month sales/order series powering the store dashboard's growth chart.
async function monthlySalesAndOrders(restaurantId, year) {
  const orders = await Order.find({
    restaurantId,
    orderStatus: { $nin: [...CANCELLED] },
    createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
  }).lean()

  const salesAmount = Array(12).fill(0)
  const ordersCount = Array(12).fill(0)

  for (const order of orders) {
    const month = new Date(order.createdAt).getMonth()
    salesAmount[month] += order.orderAmount || 0
    ordersCount[month] += 1
  }

  return { salesAmount: salesAmount.map((v) => Number(v.toFixed(2))), ordersCount }
}

const DATE_KEYWORD_DAYS = { Today: 1, 'Last 7 days': 7, 'Last 30 days': 30, 'All': null }

function statsDateRange({ startingDate, endingDate, dateKeyword }) {
  if (dateKeyword && dateKeyword in DATE_KEYWORD_DAYS) {
    const days = DATE_KEYWORD_DAYS[dateKeyword]
    if (days === null) return {}
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (days - 1))
    return { createdAt: { $gte: from } }
  }
  const range = {}
  if (startingDate) range.$gte = new Date(startingDate)
  if (endingDate) range.$lte = new Date(endingDate)
  return Object.keys(range).length ? { createdAt: range } : {}
}

// Revenue split by payment method and by pickup/delivery, as consumed by the
// store dashboard's stat cards and breakdown table.
async function paymentMethodStats(restaurantId, options) {
  const orders = await Order.find({
    restaurantId,
    orderStatus: { $nin: [...CANCELLED] },
    ...statsDateRange(options)
  }).lean()

  const bucket = (rows, type) => ({
    _type: type,
    data: {
      total_orders: rows.length,
      total_sales: Number(rows.reduce((s, o) => s + (o.orderAmount || 0), 0).toFixed(2)),
      total_sales_without_delivery: Number(
        rows.reduce((s, o) => s + ((o.orderAmount || 0) - (o.deliveryCharges || 0)), 0).toFixed(2)
      ),
      total_delivery_fee: Number(
        rows.reduce((s, o) => s + (o.deliveryCharges || 0), 0).toFixed(2)
      )
    }
  })

  // Dashboard table expects three rows per payment method: overall, pickup,
  // delivery — keyed by the subtitle map in the admin panel.
  const methodBuckets = (rows) => [
    bucket(rows, 'all'),
    bucket(
      rows.filter((o) => o.isPickedUp),
      'isPickedUp'
    ),
    bucket(
      rows.filter((o) => !o.isPickedUp),
      'isNotPickedUp'
    )
  ]

  const cod = orders.filter((o) => (o.paymentMethod || 'COD').toUpperCase() === 'COD')
  const card = orders.filter((o) => (o.paymentMethod || '').toUpperCase() !== 'COD')
  const pickup = orders.filter((o) => o.isPickedUp)
  const delivery = orders.filter((o) => !o.isPickedUp)
  const allTotals = bucket(orders, 'all').data

  return {
    ...allTotals,
    pickup_total_orders: pickup.length,
    delivery_total_orders: delivery.length,
    pickup_orders: Number(pickup.reduce((s, o) => s + (o.orderAmount || 0), 0).toFixed(2)),
    delivery_orders: Number(delivery.reduce((s, o) => s + (o.orderAmount || 0), 0).toFixed(2)),
    pickup: { total_orders: pickup.length },
    delivery: { total_orders: delivery.length },
    all: methodBuckets(orders),
    cod: methodBuckets(cod),
    card: methodBuckets(card)
  }
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

// The admin dashboard keys its whole navigation off `userType`: 'ADMIN' gets the
// platform sidebar, 'RESTAURANT' gets the single-store sidebar (menu, orders,
// delivery areas...). A restaurant owner therefore has to come back as
// 'RESTAURANT' — and with `userTypeId` set to the *restaurant* id, because the
// dashboard persists that value as the selected restaurant.
const mapUserType = (role) => {
  if (role === 'SUPER_ADMIN') return 'ADMIN'
  if (role === 'RESTAURANT_OWNER') return 'RESTAURANT'
  return 'CUSTOMER'
}

async function ownerResponse(user) {
  const tokens = signUserToken(user)
  const isAdmin = user.role === 'SUPER_ADMIN'
  const restaurants = await Restaurant.find(isAdmin ? {} : { ownerId: user._id }).lean()
  const ownRestaurant = isAdmin
    ? null
    : restaurants.find((r) => String(r._id) === String(user.restaurantId)) || restaurants[0] || null

  return {
    userId: id(user),
    token: tokens.token,
    tokenExpiration: tokens.tokenExpiration,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiration: tokens.refreshTokenExpiration,
    email: user.email,
    userType: mapUserType(user.role),
    userTypeId: isAdmin ? id(user) : id(ownRestaurant) || id(user),
    shopType: ownRestaurant?.shopType || '',
    permissions: isAdmin ? ['*'] : ['restaurant'],
    image: null,
    name: user.name,
    isActive: user.isActive !== false,
    restaurantId: ownRestaurant ? id(ownRestaurant) : null,
    restaurants: restaurants.map((r) => ({
      _id: id(r),
      orderId: id(r),
      name: r.name,
      image: r.image,
      address: r.address
    }))
  }
}

const adminUserShape = (user) => ({
  _id: id(user),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  createdAt: user.createdAt?.toISOString?.() || user.createdAt || null,
  userType: mapUserType(user.role),
  status: user.isActive === false ? 'inactive' : 'active',
  lastLogin: null,
  notes: '',
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

const vendorShape = async (owner) => {
  const rows = await Restaurant.find({ ownerId: owner._id }).lean()
  const [firstName, ...rest] = (owner.name || '').split(' ')
  return {
    _id: id(owner),
    unique_id: id(owner),
    email: owner.email,
    userType: mapUserType(owner.role),
    isActive: owner.isActive !== false,
    name: owner.name,
    image: '',
    firstName: firstName || '',
    lastName: rest.join(' '),
    phoneNumber: owner.phone || '',
    restaurants: await Promise.all(rows.map((r) => buildRestaurantTree(r)))
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
      // Unique per order — a shared fallback `addr` collides in Apollo cache.
      id: id(order.deliveryAddress) || `addr-${id(order)}`
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
    // Clients query `review { _id rating }` — never leave a raw JSON blob here.
    review: order.review
      ? {
          _id: id(order.review) || String(order.review._id || order._id),
          rating: order.review.rating ?? null,
          description: order.review.description || '',
          comments: order.review.comments || '',
          isActive: order.review.isActive !== false,
          createdAt: iso(order.review.createdAt),
          updatedAt: iso(order.review.updatedAt)
        }
      : null,
    // The admin panel treats `status`/`isActive` as "is this order still in
    // flight?", separately from the textual orderStatus.
    status: ACTIVE.has(order.orderStatus),
    isActive: ACTIVE.has(order.orderStatus),
    reason: order.reason || '',
    zone: restaurant?.zone
      ? { _id: restaurant.zone._id, title: restaurant.zone.title, tax: restaurant.zone.tax }
      : null,
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

// Notify every party that cares about this order:
// - customer (mobile list + tracking)
// - restaurant owner (kitchen / delivery tablet)
async function publishOrderChanged(orderDoc, serialized, origin) {
  const recipients = new Set()
  const customerId = orderDoc?.customerId
  if (customerId) recipients.add(String(customerId))

  const restaurantId = orderDoc?.restaurantId
  if (restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean()
    if (restaurant?.ownerId) recipients.add(String(restaurant.ownerId))
  }

  for (const userId of recipients) {
    pubsub.publish(ORDER_CHANGED, {
      orderStatusChanged: {
        userId,
        origin,
        order: serialized
      }
    })
  }
}

// Shared plumbing for the panel's order tables: text search across order id,
// customer and restaurant, plus status and date filtering.
const orderSearchFilter = async (search) => {
  if (!search) return {}
  const rx = { $regex: search, $options: 'i' }
  const [users, restaurants] = await Promise.all([
    User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .select('_id')
      .lean(),
    Restaurant.find({ name: rx }).select('_id').lean()
  ])
  return {
    $or: [
      { orderId: rx },
      { customerId: { $in: users.map((u) => u._id) } },
      { restaurantId: { $in: restaurants.map((r) => r._id) } }
    ]
  }
}

const orderStatusFilter = (orderStatus) =>
  orderStatus?.length ? { orderStatus: { $in: orderStatus } } : {}

async function paginateOrders(baseFilter, { page = 1, rows = 10 }) {
  const limit = Math.max(1, rows)
  const currentPage = Math.max(1, page)
  const totalCount = await Order.countDocuments(baseFilter)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const docs = await Order.find(baseFilter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .lean()

  return {
    orders: await Promise.all(docs.map(serializeOrder)),
    totalCount,
    currentPage,
    totalPages,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < totalPages ? currentPage + 1 : null
  }
}

// Throws unless the caller may look at this restaurant's orders.
const assertCanReadRestaurantOrders = async (ctx, restaurantId) => {
  const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
  if (auth.role === 'SUPER_ADMIN') return auth
  const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean()
  if (!restaurant || String(restaurant.ownerId) !== String(auth.userId)) {
    throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
  }
  return auth
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
    // Powers the vendor panel's Categories table.
    restaurantCategoriesPaginated: async (
      _p,
      { restaurantId, page = 1, limit = 10, search },
      ctx
    ) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurantId)

      const filter = { restaurantId }
      if (search) filter.title = { $regex: search, $options: 'i' }

      const totalCount = await Category.countDocuments(filter)
      const rows = await Category.find(filter)
        .sort({ createdAt: 1 })
        .skip(Math.max(0, (page - 1) * limit))
        .limit(limit)
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
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit))
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
    nearByRestaurantsPreview: async (_p, { shopType, latitude, longitude, page = 1, limit = 50 }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType, latitude, longitude })
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
    // Shared by the customer app and the admin panel's menu screens, so the
    // audience decides what is returned: the owner (and admins) manage the
    // live menu, everyone else sees only what has been published.
    restaurant: async (_p, { id: restaurantId }, ctx) => {
      assertPublicAccess(ctx)
      const r = await Restaurant.findById(restaurantId).lean()
      if (!r) return null
      return buildRestaurantTree(r, { audience: audienceFor(ctx, r) })
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
    topRatedVendors: async (_p, { latitude, longitude }, ctx) => {
      assertPublicAccess(ctx)
      return listRestaurants({ latitude, longitude })
    },
    topRatedVendorsPreview: async (_p, { latitude, longitude }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ latitude, longitude })
      return restaurants.map(toPreview)
    },
    getRecentOrderRestaurants: async (_p, { latitude, longitude }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ latitude, longitude })
      return restaurants.slice(0, 3).map(toPreview)
    },
    getMostOrderedRestaurants: async (_p, { shopType, latitude, longitude }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType, latitude, longitude })
      return restaurants.map(toPreview)
    },
    recentOrderRestaurantsPreview: async (_p, { latitude, longitude }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ latitude, longitude })
      return restaurants.slice(0, 3).map(toPreview)
    },
    mostOrderedRestaurantsPreview: async (_p, { shopType, latitude, longitude, page = 1, limit = 15 }, ctx) => {
      assertPublicAccess(ctx)
      const restaurants = await listRestaurants({ shopType, latitude, longitude })
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
    },
    // ---- Admin/vendor panel: order tables --------------------------------
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
        .lean()
      return Promise.all(docs.map(serializeOrder))
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
        .lean()
      return Promise.all(docs.map(serializeOrder))
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
      const { orders, totalCount } = await paginateOrders(filter, {
        page,
        rows: rowsPerPage
      })
      return { orders, totalCount }
    },
    // Feeds the store's Location screen. This API models coverage as named
    // delivery areas rather than a drawn polygon, so the map is centred on the
    // restaurant and sized to its widest area.
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
        userType: mapUserType(owner.role),
        restaurants: await Promise.all(rows.map((r) => buildRestaurantTree(r)))
      }
    },
    // ---- Super Admin: people ---------------------------------------------
    users: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      const rows = await User.find({ role: 'CUSTOMER' }).sort({ createdAt: -1 }).lean()
      return rows.map(adminUserShape)
    },
    usersPaginated: async (_p, { page = 1, limit = 10, search, status }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])

      const filter = { role: 'CUSTOMER' }
      if (search) {
        const rx = { $regex: search, $options: 'i' }
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
      }
      if (status === 'active') filter.isActive = true
      if (status === 'inactive') filter.isActive = false

      const totalCount = await User.countDocuments(filter)
      const rows = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(Math.max(0, (page - 1) * limit))
        .limit(limit)
        .lean()

      return {
        data: rows.map(adminUserShape),
        totalCount,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit))
      }
    },
    vendors: async (_p, _a, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN'])
      const owners = await User.find({ role: 'RESTAURANT_OWNER' }).sort({ createdAt: -1 }).lean()
      return Promise.all(owners.map(vendorShape))
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
    // Sub-categories aren't modelled separately in this API — food items carry
    // a free-text subCategory instead.
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
    // Lightweight guest checkout: name + phone only. Reuses an existing
    // customer with the same phone so repeat guests don't hit "already exists".
    guestCheckout: async (_p, { name, phone }, ctx) => {
      assertPublicAccess(ctx)
      const trimmedPhone = String(phone || '').trim()
      const trimmedName = String(name || '').trim() || 'Gość'
      if (!trimmedPhone) throw new GraphQLError('Phone is required')

      let user = await User.findOne({ phone: trimmedPhone })
      if (user) {
        user.name = trimmedName
        if (CONFIG.skipMobileVerification) user.phoneIsVerified = true
        await user.save()
        return authResponse(user, false)
      }

      const syntheticEmail = `guest+${trimmedPhone.replace(/\D/g, '')}@jedzto.local`
      user = await User.create({
        name: trimmedName,
        email: syntheticEmail,
        phone: trimmedPhone,
        password: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'CUSTOMER',
        emailIsVerified: CONFIG.skipEmailVerification,
        phoneIsVerified: CONFIG.skipMobileVerification
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
      await publishOrderChanged(order, serialized, 'placeOrder')
      // Kitchen tablet owns status transitions (accept / send / delivered).
      // Do not auto-advance — that raced the kitchen Accept/Reject UI.
      // scheduleOrderProgress(order._id, auth.userId)

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
          coordinates: [
            toCoord(addressInput.longitude),
            toCoord(addressInput.latitude)
          ]
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
            addressInput.longitude != null
              ? toCoord(addressInput.longitude, addr.location.coordinates[0])
              : addr.location.coordinates[0],
            addressInput.latitude != null
              ? toCoord(addressInput.latitude, addr.location.coordinates[1])
              : addr.location.coordinates[1]
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
      await publishOrderChanged(order, serialized, 'updateOrderStatus')
      return serialized
    },
    // Same operation as updateOrderStatus, under the name the admin panel's
    // order tables call.
    updateStatus: async (_p, { id: orderId, orderStatus }, ctx) => {
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
        order.paymentStatus = order.paymentStatus === 'PAID' ? 'PAID' : order.paymentStatus
      }
      if (orderStatus === 'CANCELLED' || orderStatus === 'REJECTED') {
        order.cancelledAt = now
      }
      await order.save()
      const serialized = await serializeOrder(order.toObject())
      pubsub.publish(ORDER_STATUS, { subscriptionOrder: serialized })
      await publishOrderChanged(order, serialized, 'updateStatus')
      return serialized
    },

    // Tokens here are self-contained JWTs, so refreshing just means re-issuing
    // one for whoever the presented token belongs to.
    refreshToken: async (_p, { refreshToken: presented }, ctx) => {
      assertPublicAccess(ctx)
      const claims = verifyToken(presented)
      if (!claims?.userId) {
        throw new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })
      }
      const user = await User.findById(claims.userId).lean()
      if (!user || user.isActive === false) {
        throw new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })
      }
      return ownerResponse(user)
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
      assign('minimumOrder', input.minimumOrder)
      assign('shopType', input.shopType)
      assign('tax', input.salesTax)
      assign('orderPrefix', input.orderPrefix)
      assign('cuisines', input.cuisines)
      assign('isAvailable', input.isAvailable)
      assign('openingTimes', input.openingTimes)
      await restaurant.save()

      // The owner's login email doubles as the panel username, so a password
      // change here has to land on the User document, not the restaurant.
      if (input.password) {
        const owner = await User.findById(restaurant.ownerId)
        if (owner) {
          owner.password = input.password
          await owner.save()
        }
      }

      return buildRestaurantTreeById(restaurant._id)
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
      return menuChanged(category.restaurant)
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
      return menuChanged(category.restaurant)
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
      return menuChanged(restaurant)
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
      return menuChanged(foodInput.restaurant)
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
      return menuChanged(foodInput.restaurant)
    },
    deleteFood: async (_p, { id: foodId, restaurant }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurant)
      const existing = await Food.findById(foodId)
      if (!existing || String(existing.restaurantId) !== String(restaurant)) {
        throw new GraphQLError('Food not found')
      }
      await Food.deleteOne({ _id: foodId })
      return menuChanged(restaurant)
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
      await Restaurant.updateOne(
        { _id: restaurant },
        { $set: { hasUnpublishedMenuChanges: true } }
      )
      return existing.isOutOfStock
    },
    uploadImageToS3: async (_p, { image }, ctx) => {
      assertPublicAccess(ctx)
      requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
      const imageUrl = await saveBase64Image(image, ctx.req)
      return { imageUrl }
    },
    updateDeliveryAreas: async (_p, { restaurantId, areas }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurantId)

      const names = new Set()
      for (const area of areas) {
        const name = area.name?.trim()
        if (!name) throw new GraphQLError('Nazwa obszaru nie może być pusta')
        const key = normalizeAreaName(name)
        if (names.has(key)) {
          throw new GraphQLError(`Obszar "${name}" występuje dwukrotnie`)
        }
        names.add(key)
        if (area.fee < 0) throw new GraphQLError(`Opłata za "${name}" nie może być ujemna`)
        if (area.radiusKm <= 0) throw new GraphQLError(`Promień dla "${name}" musi być większy od zera`)
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
    // Copies the owner's live menu into the snapshot the customer app reads.
    publishMenu: async (_p, { restaurantId }, ctx) => {
      assertPublicAccess(ctx)
      requireRestaurantOwner(ctx, restaurantId)
      const exists = await Restaurant.exists({ _id: restaurantId })
      if (!exists) throw new GraphQLError('Restaurant not found')

      await publishRestaurantMenu(restaurantId)
      const restaurant = await Restaurant.findById(restaurantId).lean()
      return menuPublishStatusOf(restaurant)
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
        () => pubsub.asyncIterableIterator([ORDER_STATUS]),
        (payload, variables) =>
          payload.subscriptionOrder?._id === variables.id ||
          payload.subscriptionOrder?.orderId === variables.id
      )
    },
    subscriptionRiderLocation: {
      subscribe: () => pubsub.asyncIterableIterator([RIDER_LOCATION])
    },
    orderStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([ORDER_CHANGED]),
        (payload, variables) =>
          payload.orderStatusChanged?.userId === variables.userId
      )
    },
    subscriptionNewMessage: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([CHAT_MESSAGE]),
        (payload, variables) => payload.orderId === variables.order
      )
    }
  }
}
