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
  }

  type RestaurantPreview {
    _id: ID
    name: String
    image: String
    logo: String
    deliveryTime: Int
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
  }

  type Rider {
    _id: ID
    name: String
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
    review: JSON
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
    isPickedUp: Boolean
    deliveryCharges: Float
    acceptedAt: String
    pickedAt: String
    deliveredAt: String
    cancelledAt: String
    assignedAt: String
    instructions: String
    discountAmount: Float
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
    longitude: Float
    latitude: Float
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
    minimumOrder: Float
    shopType: String
    salesTax: Float
    cuisines: [String!]
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

  type Query {
    # Simplified Multi-Vendor API
    restaurants: [Restaurant!]
    restaurantsPaginated(page: Int, limit: Int, search: String): RestaurantsPaginatedResponse
    # "Cloned" restaurants aren't a jedzto-local-api concept — always empty.
    getClonedRestaurantsPaginated(page: Int, limit: Int, search: String): RestaurantsPaginatedResponse
    categories(restaurantId: ID): [Category!]
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
  }

  type Mutation {
    metricsGeneral: MetricsGeneral
    ownerLogin(email: String!, password: String!): OwnerAuthPayload
    login(email: String, password: String, type: String!, appleId: String, idToken: String, name: String, notificationToken: String): AuthPayload
    createUser(userInput: UserInput!): AuthPayload
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
  }

  type Subscription {
    subscriptionOrder(id: String!): Order
    subscriptionRiderLocation(riderId: String!): Rider
    orderStatusChanged(userId: String!): OrderStatusChangedPayload
    subscriptionNewMessage(order: ID!): ChatMessage
  }
`
