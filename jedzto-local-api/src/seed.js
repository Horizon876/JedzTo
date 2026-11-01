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
    name: 'Właściciel Pizzeria Italiana'
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
      const ingredients =
        item.ingredients ||
        String(item.description || '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)

      const basePrice = item.price
      const variations =
        item.variations ||
        (item.sizes
          ? item.sizes.map((size) => ({
              title: size.title,
              price: Number((basePrice * (size.factor || 1)).toFixed(2)),
              discounted: 0,
              addons: []
            }))
          : [
              {
                title: 'Standard',
                price: basePrice,
                discounted: 0,
                addons: []
              }
            ])

      await Food.create({
        restaurantId,
        categoryId: category._id,
        title: item.title,
        description: item.description,
        image: item.image || IMG.food,
        price: basePrice,
        ingredients,
        variations
      })
    }
  }
}

/** Pizza / burger size ladder used by seed + ensure on existing DBs. */
const FOOD_SIZE_LADDER = [
  { title: 'Mała', factor: 0.85 },
  { title: 'Średnia', factor: 1 },
  { title: 'Duża', factor: 1.2 }
]

const SKIP_SIZE_TITLE = /napój|woda|cola|frytk|krążk|dodatk/i

/** Defaults for classic demo dishes when DB was seeded before ingredients existed. */
const DEFAULT_INGREDIENTS_BY_TITLE = {
  Margherita: ['Sos pomidorowy', 'Mozzarella', 'Bazylia'],
  Capricciosa: ['Sos pomidorowy', 'Mozzarella', 'Szynka', 'Pieczarki', 'Oliwki'],
  Pepperoni: ['Sos pomidorowy', 'Mozzarella', 'Salami pepperoni'],
  'Zielona Special': ['Sos pomidorowy', 'Mozzarella', 'Szpinak', 'Feta', 'Pesto'],
  'Classic Cheeseburger': ['Bułka', 'Wołowina 150 g', 'Cheddar', 'Sos house', 'Sałata', 'Pomidor'],
  'Przedmieście Smash': ['Bułka', 'Wołowina smash', 'Bekon', 'Cheddar', 'Sos house'],
  'BBQ Bacon': ['Bułka', 'Wołowina', 'Bekon', 'Sos BBQ', 'Cebula'],
  'Vege Falafel': ['Bułka', 'Falafel', 'Hummus', 'Pikle', 'Sałata']
}

function parseIngredientsFromDescription(description = '') {
  return String(description)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
}

function buildSizeVariations(basePrice) {
  return FOOD_SIZE_LADDER.map((size) => ({
    title: size.title,
    price: Number((basePrice * size.factor).toFixed(2)),
    discounted: 0,
    addons: []
  }))
}

function publishedFoodsMissingIngredients(restaurant, liveFoods) {
  const published = restaurant?.publishedMenu?.categories || []
  const publishedById = new Map()
  for (const category of published) {
    for (const food of category.foods || []) {
      if (food?._id) publishedById.set(String(food._id), food)
    }
  }

  return liveFoods.some((food) => {
    const liveIngredients = Array.isArray(food.ingredients)
      ? food.ingredients.filter(Boolean)
      : []
    if (!liveIngredients.length) return false
    const publishedFood = publishedById.get(String(food._id))
    if (!publishedFood) return true
    const publishedIngredients = Array.isArray(publishedFood.ingredients)
      ? publishedFood.ingredients.filter(Boolean)
      : []
    return publishedIngredients.length === 0
  })
}

/**
 * Backfills ingredients + size variations on already-seeded menus, then
 * republishes affected restaurants so the customer app sees the changes.
 */
export async function ensureMenuItemCustomization() {
  const foods = await Food.find({}).lean()
  const touchedRestaurants = new Set()
  const foodsByRestaurant = new Map()

  for (const food of foods) {
    if (food.restaurantId) {
      const key = String(food.restaurantId)
      if (!foodsByRestaurant.has(key)) foodsByRestaurant.set(key, [])
      foodsByRestaurant.get(key).push(food)
    }

    const patch = {}
    const ingredients = Array.isArray(food.ingredients) ? food.ingredients.filter(Boolean) : []
    if (!ingredients.length) {
      const fromTitle = DEFAULT_INGREDIENTS_BY_TITLE[food.title]
      const parsed = parseIngredientsFromDescription(food.description)
      if (fromTitle?.length) patch.ingredients = fromTitle
      // Only treat comma-separated descriptions as ingredient lists.
      else if (parsed.length > 1) patch.ingredients = parsed
    }

    const variations = food.variations || []
    const onlyStandard =
      variations.length <= 1 &&
      (!variations[0]?.title || /^standard$/i.test(String(variations[0].title)))
    const shouldHaveSizes = !SKIP_SIZE_TITLE.test(`${food.title} ${food.description || ''}`)

    if (onlyStandard && shouldHaveSizes) {
      const basePrice = Number(variations[0]?.price ?? food.price) || 0
      if (basePrice > 0) {
        patch.variations = buildSizeVariations(basePrice)
        patch.price = basePrice
      }
    }

    if (!Object.keys(patch).length) continue
    await Food.updateOne({ _id: food._id }, { $set: patch })
    if (patch.ingredients) {
      food.ingredients = patch.ingredients
    }
    if (food.restaurantId) touchedRestaurants.add(String(food.restaurantId))
  }

  // Republish when live foods have ingredients but the customer snapshot does not.
  const restaurants = await Restaurant.find({
    _id: { $in: [...foodsByRestaurant.keys()] }
  })
    .select('_id publishedMenu')
    .lean()

  for (const restaurant of restaurants) {
    const liveFoods = foodsByRestaurant.get(String(restaurant._id)) || []
    if (publishedFoodsMissingIngredients(restaurant, liveFoods)) {
      touchedRestaurants.add(String(restaurant._id))
    }
  }

  for (const restaurantId of touchedRestaurants) {
    await publishRestaurantMenu(restaurantId)
  }

  if (touchedRestaurants.size) {
    console.log(
      `[seed] menu customization updated for ${touchedRestaurants.size} restaurant(s)`
    )
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

// Keeps taste-chip labels (Burger, Pizza, …) in sync with restaurant cuisine
// tags on already-seeded databases — seed itself is skipped when users exist.
export async function ensureTasteCuisineTags() {
  const patches = [
    {
      match: { name: /burger/i },
      add: ['Burger', 'Burgery']
    },
    {
      match: { name: /pizza|pizzeria/i },
      add: ['Pizza']
    },
    {
      match: { name: /sushi/i },
      add: ['Sushi']
    },
    {
      match: { name: /kebab/i },
      add: ['Kebab']
    },
    {
      match: { name: /chicken|kurczak/i },
      add: ['Kurczak']
    },
    {
      match: { name: /delikatesy|sklep|premium/i },
      add: ['Zakupy', 'Sklep', 'Delikatesy']
    }
  ]

  for (const { match, add } of patches) {
    const restaurants = await Restaurant.find(match).select('_id cuisines tags').lean()
    for (const restaurant of restaurants) {
      const cuisines = [...new Set([...(restaurant.cuisines || []), ...add])]
      const tags = [...new Set([...(restaurant.tags || []), ...add])]
      const sameCuisines =
        cuisines.length === (restaurant.cuisines || []).length &&
        cuisines.every((c) => (restaurant.cuisines || []).includes(c))
      const sameTags =
        tags.length === (restaurant.tags || []).length &&
        tags.every((t) => (restaurant.tags || []).includes(t))
      if (sameCuisines && sameTags) continue
      await Restaurant.updateOne({ _id: restaurant._id }, { $set: { cuisines, tags } })
    }
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
    pickupTime: 20,
    defaultEta: 55,
    isBusy: false,
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
    pickupTime: 15,
    defaultEta: 40,
    isBusy: false,
    minimumOrder: 28,
    tax: 8,
    cuisines: ['Burger', 'Burgery', 'Amerykańska'],
    tags: ['Burger', 'Burgery', 'Amerykańska'],
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
        {
          title: 'Margherita',
          description: 'Klasyczna pizza z sosem pomidorowym i świeżą bazylią',
          ingredients: ['Sos pomidorowy', 'Mozzarella', 'Bazylia'],
          price: 29,
          image: IMG.pizza,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'Capricciosa',
          description: 'Pizza z szynką, pieczarkami i oliwkami',
          ingredients: ['Sos pomidorowy', 'Mozzarella', 'Szynka', 'Pieczarki', 'Oliwki'],
          price: 38,
          image: IMG.pizza,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'Pepperoni',
          description: 'Pikantne salami pepperoni na mozzarella',
          ingredients: ['Sos pomidorowy', 'Mozzarella', 'Salami pepperoni'],
          price: 36,
          image: IMG.pizza,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'Zielona Special',
          description: 'Wegetariańska pizza ze szpinakiem i fetą',
          ingredients: ['Sos pomidorowy', 'Mozzarella', 'Szpinak', 'Feta', 'Pesto'],
          price: 39,
          image: IMG.pizza,
          sizes: FOOD_SIZE_LADDER
        }
      ]
    },
    {
      title: 'Napoje',
      foods: [
        { title: 'Cola 0,5 l', description: 'Napój gazowany', price: 8, ingredients: [] },
        { title: 'Woda niegazowana 0,5 l', description: 'Woda mineralna', price: 6, ingredients: [] }
      ]
    }
  ])

  await addMenu(burger._id, [
    {
      title: 'Burgery',
      foods: [
        {
          title: 'Classic Cheeseburger',
          description: 'Wołowina 150 g z cheddar i sosem house',
          ingredients: ['Bułka', 'Wołowina 150 g', 'Cheddar', 'Sos house', 'Sałata', 'Pomidor'],
          price: 28,
          image: IMG.burger,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'Przedmieście Smash',
          description: 'Podwójny smash z bekonem',
          ingredients: ['Bułka', 'Wołowina smash', 'Bekon', 'Cheddar', 'Sos house'],
          price: 36,
          image: IMG.burger,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'BBQ Bacon',
          description: 'Burger z bekonem i sosem BBQ',
          ingredients: ['Bułka', 'Wołowina', 'Bekon', 'Sos BBQ', 'Cebula'],
          price: 34,
          image: IMG.burger,
          sizes: FOOD_SIZE_LADDER
        },
        {
          title: 'Vege Falafel Burger',
          description: 'Falafel z hummusem i piklami',
          ingredients: ['Bułka', 'Falafel', 'Hummus', 'Pikle', 'Sałata'],
          price: 27,
          image: IMG.burger,
          sizes: FOOD_SIZE_LADDER
        }
      ]
    },
    {
      title: 'Dodatki',
      foods: [
        { title: 'Frytki belgijskie', description: 'Grube frytki 200 g', price: 12, ingredients: [] },
        { title: 'Krążki cebulowe', description: '6 szt. z dipem', price: 14, ingredients: [] }
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
