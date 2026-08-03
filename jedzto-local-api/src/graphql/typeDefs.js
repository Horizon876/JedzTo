export const typeDefs = `#graphql
  scalar JSON

  type Point {
    coordinates: [Float!]
  }

  type OpeningTimeSlot {
    startTime: [String!]
    endTime: [String!]
  }

  type OpeningTime {
    day: String
    times: [OpeningTimeSlot!]
  }

  # Zones are GeoJSON polygons ({ coordinates: [[[lng, lat], ...]] }), not a
  # single Point — coordinates is JSON so the nested ring arrays survive
  # serialization (the mobile app reads location.coordinates[0] as a ring
  # via the zones { location { coordinates } } query).
  type ZoneLocation {
    coordinates: JSON
  }

  type Zone {
    _id: ID
    title: String
    description: String
    location: ZoneLocation
    isActive: Boolean
    tax: Float
  }

  type ReviewData {
    total: Int
    ratings: Float
    reviews: [JSON]
  }

  # Order.review must be an object type — client placeOrder/order queries
  # select subfields like _id and rating. A JSON scalar rejects that.
  type OrderReview {
    _id: ID
    rating: Int
    description: String
    comments: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  type Variation {
    _id: ID
    id: ID
    title: String
    price: Float
    discounted: Float
    addons: [ID!]
    isOutOfStock: Boolean
  }

  type FoodItem {
    _id: ID
    title: String
    description: String
    image: String
    price: Float
    subCategory: String
    isOutOfStock: Boolean
    isActive: Boolean
    ingredients: [String!]
    createdAt: String
    updatedAt: String
    variations: [Variation!]
    restaurantId: ID
    categoryId: ID
  }

  type Category {
    _id: ID
    title: String
    image: String
    restaurantId: ID
    foods: [FoodItem!]
    createdAt: String
    updatedAt: String
  }

  type Option {
    _id: ID
    id: ID
    title: String
    description: String
    price: Float
  }

  type Addon {
    _id: ID
    id: ID
    options: [ID!]
    title: String
    description: String
    quantityMinimum: Int
    quantityMaximum: Int
  }

  type RestaurantOwner {
    _id: ID
    email: String
    isActive: Boolean
  }

  type DeliveryInfo {
    minDeliveryFee: Float
    deliveryDistance: Float
    deliveryFee: Float
  }

  # A named circular area a restaurant delivers to, with its own price.
  type DeliveryArea {
    _id: ID
    name: String
    fee: Float
    minOrder: Float
    latitude: Float
    longitude: Float
    radiusKm: Float
    isActive: Boolean
  }

  input DeliveryAreaInput {
    name: String!
    fee: Float!
    minOrder: Float
    latitude: Float!
    longitude: Float!
    radiusKm: Float!
    isActive: Boolean
  }

  # Answer to "does this restaurant deliver to these coordinates, and for how
  # much?" — used by the customer app at checkout.
  type DeliveryQuote {
    available: Boolean
    fee: Float
    minOrder: Float
    areaName: String
  }

  type MenuPublishStatus {
    restaurantId: ID
    menuPublishedAt: String
    hasUnpublishedMenuChanges: Boolean
    publishedCategories: Int
    publishedItems: Int
  }

  # --- Dashboard statistics -------------------------------------------------

  type DashboardUsersPercentChange {
    usersPercent: Float
    vendorsPercent: Float
    restaurantsPercent: Float
    ridersPercent: Float
  }

  type DashboardUsers {
    usersCount: Int
    vendorsCount: Int
    restaurantsCount: Int
    ridersCount: Int
    percentageChange: DashboardUsersPercentChange
  }

  type DashboardLabelValue {
    value: Float
    label: String
  }

  type RestaurantSalesOrderCountByYear {
    salesAmount: [Float!]
    ordersCount: [Int!]
  }

  type PaymentMethodTotals {
    total_orders: Int
    total_sales: Float
    total_sales_without_delivery: Float
    total_delivery_fee: Float
  }

  type PaymentMethodBucket {
    _type: String
    data: PaymentMethodTotals
  }

  type RestaurantOrderCount {
    total_orders: Int
  }

  type RestaurantPaymentStats {
    total_orders: Int
    total_sales: Float
    total_sales_without_delivery: Float
    total_delivery_fee: Float
    pickup_total_orders: Int
    delivery_total_orders: Int
    pickup_orders: Float
    delivery_orders: Float
    pickup: RestaurantOrderCount
    delivery: RestaurantOrderCount
    # Each bucket is an array of All / Pickup / Delivery breakdowns so the
    # dashboard table can call .map() on them.
    all: [PaymentMethodBucket!]
    cod: [PaymentMethodBucket!]
    card: [PaymentMethodBucket!]
  }

  type HolidayException {
    _id: ID
    date: String!
    closed: Boolean!
    open: String
    close: String
    label: String
  }

  type BussinessDetails {
    bankName: String
    accountName: String
    accountCode: String
    accountNumber: String
    bussinessRegNo: String
    companyRegNo: String
    taxRate: Float
  }

  type Restaurant {
    _id: ID
    orderId: String
    orderPrefix: String
    unique_restaurant_id: ID
    slug: String
    username: String
    commissionRate: Float
    name: String
    image: String
    logo: String
    address: String
    location: Point
    deliveryBounds: Point
    deliveryInfo: DeliveryInfo
    deliveryTime: Int
    pickupTime: Int
    """Fallback ETA (minutes) when not busy and no recent accepted order."""
    defaultEta: Int
    """Manual kitchen overload switch — when true, currentEta is 90."""
    isBusy: Boolean
    """Live ETA shown on restaurant listings (busy / recent order / default)."""
    currentEta: Int
    minimumOrder: Float
    tax: Float
    shopType: String
    freeDelivery: Boolean
    acceptVouchers: Boolean
    cuisines: [String!]
    tags: [String!]
    reviewCount: Int
    reviewAverage: Float
    reviewData: ReviewData
    categories: [Category!]
    options: [Option!]
    addons: [Addon!]
    rating: Float
    isAvailable: Boolean
    isActive: Boolean
    isSuspended: Boolean
    suspendedReason: String
    pausedUntil: String
    holidayExceptions: [HolidayException!]
    freeDeliveryFrom: Float
    openingTimes: [OpeningTime!]
    phone: String
    restaurantUrl: String
    stripeDetailsSubmitted: Boolean
    bussinessDetails: BussinessDetails
    currentWalletAmount: Float
    totalWalletAmount: Float
    withdrawnWalletAmount: Float
    zone: Zone
    ownerId: ID
    owner: RestaurantOwner
    deliveryAreas: [DeliveryArea!]
    menuPublishedAt: String
    hasUnpublishedMenuChanges: Boolean
  }

  # Same shape as RestaurantPreview — the mobile app's home-screen carousels
  # ("Order it again" / "Popular right now" / "Top Brands") share a single
  # GraphQL fragment declared "on RestaurantCarouselPreview", so that type
  # name must exist even though the fields are identical to RestaurantPreview.
  type RestaurantCarouselPreview {
    _id: ID
    name: String
    image: String
    logo: String
    deliveryTime: Int
    pickupTime: Int
    defaultEta: Int
    isBusy: Boolean
    currentEta: Int
    minimumOrder: Float
    isAvailable: Boolean
    tax: Float
    shopType: String
    cuisines: [String!]
    tags: [String!]
    reviewCount: Int
    reviewAverage: Float
    freeDelivery: Boolean
    acceptVouchers: Boolean
    location: Point
    openingTimes: [OpeningTime!]
    deliveryFee: Float
    deliveryAreaName: String
  }

  type RestaurantPreview {
    _id: ID
    name: String
    image: String
    logo: String
    deliveryTime: Int
    pickupTime: Int
    defaultEta: Int
    isBusy: Boolean
    currentEta: Int
    minimumOrder: Float
    isAvailable: Boolean
    isSuspended: Boolean
    pausedUntil: String
    tax: Float
    shopType: String
    cuisines: [String!]
    tags: [String!]
    reviewCount: Int
    reviewAverage: Float
    freeDelivery: Boolean
    acceptVouchers: Boolean
    location: Point
    openingTimes: [OpeningTime!]
    deliveryFee: Float
    deliveryAreaName: String
    address: String
  }

  type Offer {
    _id: ID
    name: String
    tag: String
    restaurants: [String!]
  }

  type Section {
    _id: ID
    name: String
    restaurants: [String!]
  }

  type NearByRestaurants {
    offers: [Offer!]
    sections: [Section!]
    restaurants: [Restaurant!]
  }

  type NearByRestaurantsPreview {
    offers: [Offer!]
    sections: [Section!]
    restaurants: [RestaurantPreview!]
  }

  type Cuisine {
    _id: ID
    name: String
    description: String
    image: String
    shopType: String
  }

  type Banner {
    _id: ID
    title: String
    description: String
    action: String
    screen: String
    file: String
    parameters: String
  }

  type Configuration {
    _id: ID
    currency: String
    currencySymbol: String
    deliveryRate: Float
    twilioEnabled: Boolean
    appAmplitudeApiKey: String
    customerAppSentryUrl: String
    termsAndConditions: String
    privacyPolicy: String
    testOtp: String
    skipMobileVerification: Boolean
    skipEmailVerification: Boolean
    costType: String
    publishableKey: String
    secretKey: String
    googlePlacesApiBaseUrl: String
    riderAppSentryUrl: String
  }

  type TipConfig {
    _id: ID
    tipVariations: [Float!]
    enabled: Boolean
  }

  type TaxConfig {
    _id: ID
    taxationCharges: Float
    enabled: Boolean
  }

  type Address {
    _id: ID
    id: ID
    label: String
    deliveryAddress: String
    details: String
    location: Point
    selected: Boolean
  }

  type UserProfile {
    _id: ID
    name: String
    phone: String
    phoneIsVerified: Boolean
    email: String
    emailIsVerified: Boolean
    notificationToken: String
    isActive: Boolean
    isOrderNotification: Boolean
    isOfferNotification: Boolean
    addresses: [Address!]
    favourite: [String!]
    role: String
  }

  type AuthPayload {
    userId: String
    token: String
    tokenExpiration: Int
    isActive: Boolean
    name: String
    email: String
    phone: String
    isNewUser: Boolean
  }

  type OwnerRestaurant {
    _id: ID
    orderId: String
    name: String
    image: String
    address: String
  }

  type OwnerAuthPayload {
    userId: String
    token: String
    tokenExpiration: Int
    email: String
    userType: String
    shopType: String
    restaurantId: ID
    restaurants: [OwnerRestaurant!]
    permissions: [String!]
    userTypeId: String
    image: String
    name: String
    refreshToken: String
    refreshTokenExpiration: Int
    isActive: Boolean
  }

  type MetricsGeneral {
    excellence: String
    topgun: String
    experience: String
    skydiver: String
    rider: String
    haha: String
    hehe: String
    huhu: String
    yoyo: String
    turu: String
  }

  type ResultPayload {
    result: Boolean
  }

  type OrderItemAddon {
    _id: ID
    id: ID
    title: String
    description: String
    quantityMinimum: Int
    quantityMaximum: Int
    options: [Option!]
  }

  type OrderItem {
    _id: ID
    id: ID
    title: String
    food: String
    description: String
    image: String
    quantity: Int
    variation: Variation
    addons: [OrderItemAddon!]
    specialInstructions: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  type Rider {
    _id: ID
    name: String
    username: String
    available: Boolean
    phone: String
    location: Point
  }

  type OrderUser {
    _id: ID
    name: String
    phone: String
    email: String
  }

  type DeliveryAddress {
    id: ID
    location: Point
    deliveryAddress: String
    details: String
    label: String
  }

  type Order {
    _id: ID
    id: ID
    orderId: String
    restaurant: Restaurant
    restaurantId: ID
    deliveryAddress: DeliveryAddress
    items: [OrderItem!]
    user: OrderUser
    rider: Rider
    review: OrderReview
    paymentMethod: String
    paidAmount: Float
    orderAmount: Float
    orderStatus: String
    paymentStatus: String
    tipping: Float
    taxationAmount: Float
    createdAt: String
    completionTime: String
    preparationTime: String
    orderDate: String
    expectedTime: String
    preparationEtaMinutes: Int
    deliveryEtaMinutes: Int
    deliveryExpectedTime: String
    platformCommissionRate: Float
    platformCommission: Float
    stripePaymentIntentId: String
    refundedAt: String
    refundAmount: Float
    acceptedEtaMinutes: Int
    isPickedUp: Boolean
    deliveryCharges: Float
    acceptedAt: String
    pickedAt: String
    deliveredAt: String
    cancelledAt: String
    assignedAt: String
    instructions: String
    discountAmount: Float
    status: Boolean
    isActive: Boolean
    reason: String
    zone: Zone
  }

  type OrdersPaginatedResponse {
    orders: [Order!]
    totalCount: Int
    currentPage: Int
    totalPages: Int
    prevPage: Int
    nextPage: Int
  }

  type ActiveOrdersResponse {
    orders: [Order!]
    totalCount: Int
  }

  type OrderStatusChangedPayload {
    userId: String
    origin: String
    order: Order
  }

  type ChatUser {
    id: ID
    name: String
  }

  type ChatMessage {
    id: ID
    message: String
    image: String
    user: ChatUser
    createdAt: String
  }

  type ChatMessagePayload {
    success: Boolean
    message: String
    data: ChatMessage
  }

  type PopularItem {
    id: ID
    title: String
    count: Int
  }

  type AppVersionPlatform {
    android: String
    ios: String
  }

  type Versions {
    customerAppVersion: AppVersionPlatform
    riderAppVersion: AppVersionPlatform
    restaurantAppVersion: AppVersionPlatform
  }

  type ShopType {
    _id: ID
    image: String
    name: String
    slug: String
    isActive: Boolean
  }

  type ShopTypesPayload {
    data: [ShopType!]
  }

  input FetchShopTypeFilter {
    isActive: Boolean
    search: String
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  type FetchShopTypesResponse {
    data: [ShopType!]
    total: Int
    page: Int
    pageSize: Int
    totalPages: Int
    hasNextPage: Boolean
    hasPrevPage: Boolean
  }

  input FetchUniqueShopTypeInput {
    _id: String
    name: String
    slug: String
  }

  input CreateShopTypeInput {
    name: String!
    image: String
  }

  input UpdateShopTypeInput {
    _id: String!
    name: String
    image: String
    isActive: Boolean
  }

  enum DeleteTypeEnum {
    SOFT
    HARD
  }

  type SubCategory {
    _id: ID
    title: String
    parentCategoryId: String
  }

  type Coupon {
    _id: ID
    title: String
    discount: Float
    enabled: Boolean
  }

  type City {
    id: ID
    name: String
    latitude: Float
    longitude: Float
  }

  type CountryCities {
    cities: [City!]
  }

  input AddressInput {
    _id: String
    # Clients (mobile + web) send coordinates as strings ("" + number).
    longitude: String
    latitude: String
    deliveryAddress: String
    details: String
    label: String
  }

  input OrderInput {
    food: String
    variation: String
    addons: [OrderAddonInput!]
    quantity: Int
    specialInstructions: String
  }

  input OrderAddonInput {
    _id: String
    options: [String!]
  }

  input UserInput {
    phone: String
    email: String
    password: String
    name: String
    notificationToken: String
    appleId: String
    emailIsVerified: Boolean
    isPhoneExists: Boolean
  }

  input UpdateUserInput {
    name: String!
    phone: String
    phoneIsVerified: Boolean
    emailIsVerified: Boolean
  }

  input ChatMessageInput {
    message: String
    image: String
  }

  input RestaurantInput {
    name: String!
    address: String!
    phone: String
    image: String
    logo: String
    deliveryTime: Int
    pickupTime: Int
    minimumOrder: Float
    shopType: String
    salesTax: Float
    cuisines: [String!]
  }

  input RestaurantProfileInput {
    _id: String!
    name: String
    address: String
    phone: String
    image: String
    logo: String
    deliveryTime: Int
    pickupTime: Int
    minimumOrder: Float
    username: String
    password: String
    shopType: String
    salesTax: Float
    orderPrefix: String
    cuisines: [String!]
    isAvailable: Boolean
    openingTimes: JSON
    commissionRate: Float
    isSuspended: Boolean
    suspendedReason: String
    pausedUntil: String
    holidayExceptions: JSON
    freeDeliveryFrom: Float
    freeDelivery: Boolean
  }

  # Customer accounts as listed on the super admin's Users screen.
  type AdminUser {
    _id: ID
    name: String
    email: String
    phone: String
    createdAt: String
    userType: String
    status: String
    lastLogin: String
    notes: String
    addresses: [Address!]
  }

  type UsersPaginatedResponse {
    data: [AdminUser!]
    totalCount: Int
    currentPage: Int
    totalPages: Int
  }

  # Restaurant owners as listed on the super admin's Vendors screen.
  type Vendor {
    _id: ID
    unique_id: ID
    email: String
    userType: String
    isActive: Boolean
    name: String
    image: String
    firstName: String
    lastName: String
    phoneNumber: String
    restaurants: [Restaurant!]
  }

  type RestaurantOwnerRestaurants {
    _id: ID
    email: String
    userType: String
    restaurants: [Restaurant!]
  }

  type CircleBounds {
    radius: Float
  }

  type RestaurantDeliveryZoneInfo {
    boundType: String
    deliveryBounds: Point
    location: Point
    circleBounds: CircleBounds
    address: String
    city: String
    postCode: String
  }

  type GeneratedOwnerCredentials {
    userId: ID
    email: String
    temporaryPassword: String
    role: String
    restaurantId: ID
  }

  type CreateRestaurantPayload {
    restaurant: Restaurant
    owner: GeneratedOwnerCredentials
  }

  input SubCategoryInput {
    _id: String
    title: String
    parentCategoryId: String
  }

  input CategoryInput {
    _id: String
    restaurant: ID!
    title: String!
    image: String
    subCategories: [SubCategoryInput!]
  }

  input VariationInput {
    _id: String
    title: String
    price: Float!
    discounted: Float
    addons: [ID!]
    isOutOfStock: Boolean
  }

  input FoodInput {
    _id: String
    restaurant: ID!
    category: ID!
    subCategory: String
    title: String!
    description: String
    image: String
    isOutOfStock: Boolean
    isActive: Boolean
    ingredients: [String!]
    variations: [VariationInput!]
  }

  type UploadImageResult {
    imageUrl: String
  }

  # JedzTo — Super Admin "Stores" list (enatega-multivendor-admin) paginates
  # instead of fetching the flat restaurants list.
  type RestaurantsPaginatedResponse {
    data: [Restaurant!]
    totalCount: Int
    currentPage: Int
    totalPages: Int
  }

  type CategoriesPaginatedResponse {
    data: [Category!]
    totalCount: Int
    currentPage: Int
    totalPages: Int
  }

  type Query {
    # Simplified Multi-Vendor API
    restaurants: [Restaurant!]
    restaurantsPaginated(page: Int, limit: Int, search: String): RestaurantsPaginatedResponse
    # "Cloned" restaurants aren't a jedzto-local-api concept — always empty.
    getClonedRestaurantsPaginated(page: Int, limit: Int, search: String): RestaurantsPaginatedResponse
    categories(restaurantId: ID): [Category!]
    restaurantCategoriesPaginated(restaurantId: String!, page: Int, limit: Int, search: String): CategoriesPaginatedResponse
    food(restaurantId: ID!): [FoodItem!]

    # Enatega-compatible customer app
    configuration: Configuration
    nearByRestaurants(latitude: Float, longitude: Float, shopType: String): NearByRestaurants
    nearByRestaurantsPreview(latitude: Float, longitude: Float, shopType: String, page: Int, limit: Int): NearByRestaurantsPreview
    restaurant(id: String): Restaurant
    cuisines: [Cuisine!]
    banners: [Banner!]
    zones: [Zone!]
    tips: TipConfig
    taxes: TaxConfig
    profile: UserProfile
    orders(offset: Int): [Order!]
    order(id: String!): Order
    getUsersActiveOrders(page: Int!, limit: Int!, offset: Int!): [Order!]
    getUsersPastOrders(page: Int!, limit: Int!, offset: Int!): [Order!]
    topRatedVendors(latitude: Float!, longitude: Float!): [Restaurant!]
    topRatedVendorsPreview(latitude: Float!, longitude: Float!): [RestaurantCarouselPreview!]
    getRecentOrderRestaurants(latitude: Float!, longitude: Float!): [RestaurantPreview!]
    getMostOrderedRestaurants(latitude: Float!, longitude: Float!, shopType: String, page: Int, limit: Int): [RestaurantPreview!]
    # Aliases matching the mobile app's actual query names (Enatega-style
    # "...Preview" carousel queries) — see getRecentOrderRestaurants /
    # getMostOrderedRestaurants above for the equivalent "get..." forms.
    recentOrderRestaurantsPreview(latitude: Float!, longitude: Float!): [RestaurantCarouselPreview!]
    mostOrderedRestaurantsPreview(latitude: Float!, longitude: Float!, shopType: String, page: Int, limit: Int): [RestaurantCarouselPreview!]
    UserFavourite(latitude: Float, longitude: Float): [RestaurantPreview!]
    userFavourite(latitude: Float, longitude: Float): [Restaurant!]
    popularItems(restaurantId: String!): [PopularItem!]
    popularFoodItems(restaurantId: String!): [FoodItem!]
    relatedItems(itemId: String!, restaurantId: String!): [FoodItem!]
    getVersions: Versions
    fetchAllShopTypes: ShopTypesPayload
    fetchShopTypes(filter: FetchShopTypeFilter, pagination: PaginationInput): FetchShopTypesResponse
    fetchShopTypeByUnique(dto: FetchUniqueShopTypeInput): ShopType
    subCategories: [SubCategory!]
    subCategoriesByParentId(parentCategoryId: String!): [SubCategory!]
    getCountryByIso(iso: String!): CountryCities
    rider(id: String): Rider
    chat(order: ID!): [ChatMessage!]
    GetReviewsByRestaurant(restaurant: String!): ReviewData
    ownerSession: OwnerAuthPayload
    hasOwnerPermission(permission: String!): Boolean
    myRestaurants: [Restaurant!]
    restaurantOrders(restaurantId: ID!): [Order!]
    ordersByRestId(restaurant: String!, page: Int, rows: Int, search: String, orderStatus: [String]): OrdersPaginatedResponse
    ordersByRestIdWithoutPagination(restaurant: String!, search: String): [Order!]
    allOrders(page: Int): [Order!]
    allOrdersPaginated(
      page: Int
      rows: Int
      dateKeyword: String
      starting_date: String
      ending_date: String
      orderStatus: [String]
      search: String
    ): OrdersPaginatedResponse
    allOrdersWithoutPagination(dateKeyword: String, starting_date: String, ending_date: String): [Order!]
    getActiveOrders(restaurantId: ID, page: Int, rowsPerPage: Int, actions: [String], search: String): ActiveOrdersResponse
    getRestaurantDeliveryZoneInfo(id: ID!): RestaurantDeliveryZoneInfo
    restaurantByOwner(id: String): RestaurantOwnerRestaurants
    users: [AdminUser!]
    usersPaginated(page: Int, limit: Int, search: String, registrationMethod: String, status: String): UsersPaginatedResponse
    vendors: [Vendor!]
    getVendor(id: String!): Vendor
    subCategory(_id: String!): SubCategory
    deliveryQuote(restaurantId: ID!, latitude: Float!, longitude: Float!): DeliveryQuote
    menuPublishStatus(restaurantId: ID!): MenuPublishStatus
    restaurantSettlements(periodKey: String): [RestaurantSettlement!]
    restaurantSettlement(restaurantId: ID!, periodKey: String): RestaurantSettlement
    restaurantSalesReport(restaurantId: ID!, from: String, to: String): RestaurantSalesReport
    getDashboardUsers: DashboardUsers
    getDashboardUsersByYear(year: Int!): DashboardUsers
    getDashboardOrdersByType: [DashboardLabelValue!]
    getDashboardSalesByType: [DashboardLabelValue!]
    getRestaurantDashboardSalesOrderCountDetailsByYear(restaurant: String!, year: Int!): RestaurantSalesOrderCountByYear
    getRestaurantDashboardOrderSalesDetailsByPaymentMethod(
      restaurant: String!
      starting_date: String!
      ending_date: String!
      dateKeyword: String
    ): RestaurantPaymentStats
  }

  type Mutation {
    metricsGeneral: MetricsGeneral
    ownerLogin(email: String!, password: String!): OwnerAuthPayload
    login(email: String, password: String, type: String!, appleId: String, idToken: String, name: String, notificationToken: String): AuthPayload
    createUser(userInput: UserInput!): AuthPayload
    guestCheckout(name: String!, phone: String!): AuthPayload
    updateUser(updateUserInput: UpdateUserInput!): UserProfile
    emailExist(email: String!): Boolean
    phoneExist(phone: String!): Boolean
    sendOtpToEmail(email: String!): ResultPayload
    sendOtpToPhoneNumber(phone: String!): ResultPayload
    verifyOtp(otp: String!, email: String, phone: String): ResultPayload
    forgotPassword(email: String!): ResultPayload
    resetPassword(password: String!, email: String!, otp: String!): ResultPayload
    placeOrder(
      restaurant: String!
      orderInput: [OrderInput!]!
      paymentMethod: String!
      couponCode: String
      tipping: Float!
      taxationAmount: Float!
      address: AddressInput!
      orderDate: String!
      isPickedUp: Boolean!
      deliveryCharges: Float!
      instructions: String
    ): Order
    createAddress(addressInput: AddressInput!): UserProfile
    editAddress(addressInput: AddressInput!): UserProfile
    deleteAddress(id: ID!): UserProfile
    deleteBulkAddresses(ids: [ID!]!): UserProfile
    selectAddress(id: String!): UserProfile
    changePassword(oldPassword: String!, newPassword: String!): Boolean
    pushToken(token: String): UserProfile
    updateNotificationStatus(offerNotification: Boolean!, orderNotification: Boolean!): UserProfile
    addFavourite(id: String!): UserProfile
    abortOrder(id: String!): Order
    Coupon(coupon: String!, restaurantId: ID!): Coupon
    sendChatMessage(orderId: ID!, messageInput: ChatMessageInput!): ChatMessagePayload
    Deactivate(isActive: Boolean!, email: String!): UserProfile
    reviewOrder(order: String, rating: Int, description: String): Order
    updateOrderStatus(orderId: ID!, status: String!): Order

    # Super Admin — restaurant onboarding
    createRestaurant(restaurant: RestaurantInput!, ownerName: String!, ownerEmail: String!): CreateRestaurantPayload
    hardDeleteRestaurant(id: String!): Boolean
    createShopType(dto: CreateShopTypeInput): ShopType
    updateShopType(dto: UpdateShopTypeInput): ShopType
    deleteShopType(id: String!, type: DeleteTypeEnum): ShopType

    # Vendor Panel — menu management (scoped to caller's restaurantId)
    createCategory(category: CategoryInput!): Restaurant
    editCategory(category: CategoryInput!): Restaurant
    deleteCategory(id: String!, restaurant: String!): Restaurant
    createFood(foodInput: FoodInput!): Restaurant
    editFood(foodInput: FoodInput!): Restaurant
    deleteFood(id: String!, restaurant: String!, categoryId: String!): Restaurant
    updateFoodOutOfStock(id: String!, restaurant: String!, categoryId: String!): Boolean
    uploadImageToS3(image: String!): UploadImageResult
    updateDeliveryAreas(restaurantId: ID!, areas: [DeliveryAreaInput!]!): Restaurant
    publishMenu(restaurantId: ID!): MenuPublishStatus
    updateStatus(
      id: String!
      orderStatus: String!
      preparationEtaMinutes: Int
      deliveryEtaMinutes: Int
    ): Order
    updateOrderEta(
      id: String!
      preparationEtaMinutes: Int
      deliveryEtaMinutes: Int
    ): Order
    updateRestaurantOrderTimes(
      restaurantId: ID!
      deliveryTime: Int
      pickupTime: Int
      defaultEta: Int
      isBusy: Boolean
    ): Restaurant
    editRestaurant(restaurant: RestaurantProfileInput!): Restaurant
    suspendRestaurant(restaurantId: ID!, isSuspended: Boolean!, reason: String): Restaurant
    setRestaurantPause(restaurantId: ID!, paused: Boolean!, pausedUntil: String): Restaurant
    setRestaurantHolidays(restaurantId: ID!, holidays: [HolidayExceptionInput!]!): Restaurant
    settleRestaurantPeriod(restaurantId: ID!, periodKey: String!): RestaurantSettlement
    refundOrder(orderId: ID!, amount: Float): Order
    refreshToken(refreshToken: String!, userType: String!): OwnerAuthPayload
  }

  input HolidayExceptionInput {
    date: String!
    closed: Boolean
    open: String
    close: String
    label: String
  }

  type RestaurantSettlement {
    _id: ID
    restaurantId: ID!
    restaurantName: String
    periodKey: String!
    periodStart: String
    periodEnd: String
    onlineGross: Float!
    cashGross: Float!
    totalGross: Float!
    commissionRate: Float!
    commissionOnOnline: Float!
    commissionOnCash: Float!
    commissionDue: Float!
    cashCommissionOwed: Float!
    onlinePayoutDue: Float!
    status: String!
    settledAt: String
  }

  type RestaurantSalesReport {
    restaurantId: ID!
    from: String
    to: String
    totalGross: Float!
    onlineGross: Float!
    cashGross: Float!
    orderCount: Int!
    topItems: [PopularItem!]
    byWeekday: [WeekdaySales!]
  }

  type WeekdaySales {
    weekday: Int!
    label: String!
    gross: Float!
    orderCount: Int!
  }

  type Subscription {
    subscriptionOrder(id: String!): Order
    subscriptionRiderLocation(riderId: String!): Rider
    orderStatusChanged(userId: String!): OrderStatusChangedPayload
    subscriptionNewMessage(order: ID!): ChatMessage
    subscriptionRestaurantUpdated: RestaurantTimesUpdate
  }

  type RestaurantTimesUpdate {
    _id: ID!
    deliveryTime: Int
    pickupTime: Int
    defaultEta: Int
    isBusy: Boolean
    currentEta: Int
  }
`


