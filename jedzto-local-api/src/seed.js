import { User, Restaurant, Category, Food, Order, ShopType } from './models/index.js'
import { publishRestaurantMenu } from './services/menu.js'

const IMG = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80',
  food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
}

const OPENING_TIMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => ({
  day,
  times: [{ startTime: ['00', '00'], endTime: ['23', '59'] }]
}))

const CREDENTIALS = {
  admin: { email: 'admin@jedzto.local', password: 'admin1234', name: 'Admin JedzTo' },
  owner1: {
    email: 'owner1@jedzto.local',
    password: 'owner1234',
    name: 'Właściciel Pizzerii Zielona'
  },
  owner2: {
    email: 'owner2@jedzto.local',
    password: 'owner1234',
    name: 'Właściciel Burger Przedmieście'
  },
  customer: {
    email: 'demo@jedzto.local',
    password: 'demo1234',
    name: 'Demo JedzTo',
    phone: '+48123456789'
  }
}

async function addMenu(restaurantId, categoriesSpec) {
  for (const cat of categoriesSpec) {
    const category = await Category.create({
      restaurantId,
      title: cat.title
    })
    for (const item of cat.foods) {
      await Food.create({
        restaurantId,
        categoryId: category._id,
        title: item.title,
        description: item.description,
        image: item.image || IMG.food,
        price: item.price,
        variations: [
          {
            title: 'Standard',
            price: item.price,
            discounted: 0,
            addons: []
          }
        ]
      })
    }
  }
}

const DEFAULT_SHOP_TYPES = [
  { _id: 'restaurant', name: 'Restaurant', image: '' },
  { _id: 'grocery', name: 'Grocery', image: '' }
]

// Runs on every boot (independent of the user/restaurant seed short-circuit
// below) so the "Shop Category" dropdown in the Super Admin wizard always
// has options, even on a database that was seeded before ShopType existed.
export async function ensureShopTypes() {
  for (const shopType of DEFAULT_SHOP_TYPES) {
    await ShopType.updateOne(
      { _id: shopType._id },
      { $setOnInsert: shopType },
      { upsert: true }
    )
  }
}

export async function seedDatabase({ force = false } = {}) {
  await ensureShopTypes()

  const userCount = await User.countDocuments()
  if (userCount > 0 && !force) {
    console.log('[seed] Database already has users — skipping seed')
    return { seeded: false, credentials: CREDENTIALS }
  }

  if (force) {
    await Promise.all([
      Order.deleteMany({}),
      Food.deleteMany({}),
      Category.deleteMany({}),
      Restaurant.deleteMany({}),
      User.deleteMany({})
    ])
  }

  const admin = await User.create({
    ...CREDENTIALS.admin,
    role: 'SUPER_ADMIN',
    emailIsVerified: true,
    phoneIsVerified: true
  })

  const owner1 = await User.create({
    ...CREDENTIALS.owner1,
    role: 'RESTAURANT_OWNER',
    emailIsVerified: true,
    phoneIsVerified: true
  })

  const owner2 = await User.create({
    ...CREDENTIALS.owner2,
    role: 'RESTAURANT_OWNER',
    emailIsVerified: true,
    phoneIsVerified: true
  })

  const customer = await User.create({
    ...CREDENTIALS.customer,
    role: 'CUSTOMER',
    emailIsVerified: true,
    phoneIsVerified: true,
    addresses: [
      {
        label: 'Home',
        deliveryAddress: 'Rynek 1, 32-400 Myślenice, Polska',
        details: '',
        location: { coordinates: [19.9381, 49.8339] },
        selected: true
      }
    ]
  })

  const pizzeria = await Restaurant.create({
    ownerId: owner1._id,
    name: 'Pizzeria Zielona',
    address: 'ul. Handlowa 12, 32-440 Sułkowice',
    phone: '+48123450001',
    image: IMG.pizza,
    logo: IMG.logo,
    location: { coordinates: [19.8011, 49.8408] },
    deliveryTime: 35,
    minimumOrder: 30,
    tax: 8,
    cuisines: ['Pizza', 'Włoska'],
    tags: ['Pizza', 'Włoska'],
    orderPrefix: 'PIZ',
    openingTimes: OPENING_TIMES,
    reviewCount: 24,
    reviewAverage: 4.6,
    rating: 4.6,
    deliveryAreas: [
      { name: 'Sułkowice', fee: 0, minOrder: 30, latitude: 49.8408, longitude: 19.8011, radiusKm: 3 },
      { name: 'Myślenice', fee: 6, minOrder: 40, latitude: 49.8339, longitude: 19.9381, radiusKm: 4 }
    ],
    bussinessDetails: {
      companyRegNo: '5250000001',
      bussinessRegNo: '000000001'
    }
  })

  const burger = await Restaurant.create({
    ownerId: owner2._id,
    name: 'Burger Przedmieście',
    address: 'ul. Przedmieście 3, 32-400 Myślenice',
    phone: '+48123450004',
    image: IMG.burger,
    logo: IMG.logo,
    location: { coordinates: [19.9425, 49.8355] },
    deliveryTime: 25,
    minimumOrder: 28,
    tax: 8,
    cuisines: ['Burgery', 'Amerykańska'],
    tags: ['Burgery', 'Amerykańska'],
    orderPrefix: 'BUR',
    openingTimes: OPENING_TIMES,
    reviewCount: 18,
    reviewAverage: 4.5,
    rating: 4.5,
    // Matches the pricing the owner described: free inside Myślenice, 4 zł to
    // Jawornik, and nothing at all further out (e.g. Rudnik) — that address
    // simply will not see this restaurant.
    deliveryAreas: [
      { name: 'Myślenice', fee: 0, minOrder: 28, latitude: 49.8339, longitude: 19.9381, radiusKm: 4 },
      { name: 'Jawornik', fee: 4, minOrder: 35, latitude: 49.8858, longitude: 19.9314, radiusKm: 2.5 }
    ],
    bussinessDetails: {
      companyRegNo: '5250000002',
      bussinessRegNo: '000000002'
    }
  })

  await addMenu(pizzeria._id, [
    {
      title: 'Pizza',
      foods: [
        { title: 'Margherita', description: 'Sos pomidorowy, mozzarella, bazylia', price: 29, image: IMG.pizza },
        { title: 'Capricciosa', description: 'Szynka, pieczarki, oliwki', price: 38, image: IMG.pizza },
        { title: 'Pepperoni', description: 'Salami pepperoni, mozzarella', price: 36, image: IMG.pizza },
        { title: 'Zielona Special', description: 'Szpinak, feta, pesto', price: 39, image: IMG.pizza }
      ]
    },
    {
      title: 'Napoje',
      foods: [
        { title: 'Cola 0,5 l', description: 'Napój gazowany', price: 8 },
        { title: 'Woda niegazowana 0,5 l', description: 'Woda mineralna', price: 6 }
      ]
    }
  ])

  await addMenu(burger._id, [
    {
      title: 'Burgery',
      foods: [
        { title: 'Classic Cheeseburger', description: 'Wołowina 150 g, cheddar, sos house', price: 28, image: IMG.burger },
        { title: 'Przedmieście Smash', description: 'Podwójny smash, bekon', price: 36, image: IMG.burger },
        { title: 'BBQ Bacon', description: 'Wołowina, bekon, BBQ', price: 34, image: IMG.burger },
        { title: 'Vege Falafel Burger', description: 'Falafel, hummus, pikle', price: 27, image: IMG.burger }
      ]
    },
    {
      title: 'Dodatki',
      foods: [
        { title: 'Frytki belgijskie', description: 'Grube frytki 200 g', price: 12 },
        { title: 'Krążki cebulowe', description: '6 szt. z dipem', price: 14 }
      ]
    }
  ])

  // Restaurants are created after their owners, so backfill restaurantId
  // now — required by requireRestaurantOwner() for menu-management scoping.
  owner1.restaurantId = pizzeria._id
  await owner1.save()
  owner2.restaurantId = burger._id
  await owner2.save()

  // Customers only ever see the published snapshot, so the seeded menus have
  // to be pushed live or the app would start out empty.
  await publishRestaurantMenu(pizzeria._id)
  await publishRestaurantMenu(burger._id)

  console.log('[seed] Multi-vendor seed complete')
  console.log(`  SUPER_ADMIN:       ${CREDENTIALS.admin.email} / ${CREDENTIALS.admin.password}`)
  console.log(`  RESTAURANT_OWNER1: ${CREDENTIALS.owner1.email} / ${CREDENTIALS.owner1.password}`)
  console.log(`  RESTAURANT_OWNER2: ${CREDENTIALS.owner2.email} / ${CREDENTIALS.owner2.password}`)
  console.log(`  CUSTOMER:          ${CREDENTIALS.customer.email} / ${CREDENTIALS.customer.password}`)

  return {
    seeded: true,
    credentials: CREDENTIALS,
    ids: {
      admin: admin._id,
      owner1: owner1._id,
      owner2: owner2._id,
      customer: customer._id,
      pizzeria: pizzeria._id,
      burger: burger._id
    }
  }
}

export { CREDENTIALS }
