/**
 * Local JedzTo restaurant catalogue (Myślenice / Sułkowice / Jawornik).
 *
 * Used when USE_JEDZTO_LOCAL_RESTAURANTS is enabled in environment.config.js —
 * the hosted Enatega API is not writable without proprietary backend credentials,
 * so these 5 stores + menus live in the client for the JedzTo demo.
 */

const IMG = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
  pizza2: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?w=800&q=80',
  chinese: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  chicken: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&q=80',
  logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80',
  food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
}

const OPENING_TIMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => ({
  day,
  times: [{ startTime: ['00', '00'], endTime: ['23', '59'] }]
}))

let foodSeq = 1
let catSeq = 1
let varSeq = 1

const food = (title, description, price, image = IMG.food) => {
  const id = `jedzto-food-${foodSeq++}`
  const variationId = `jedzto-var-${varSeq++}`
  return {
    _id: id,
    title,
    description,
    image,
    subCategory: null,
    isOutOfStock: false,
    variations: [
      {
        _id: variationId,
        title: 'Standard',
        price,
        discounted: 0,
        addons: []
      }
    ]
  }
}

const category = (title, foods) => ({
  _id: `jedzto-cat-${catSeq++}`,
  title,
  foods
})

const restaurant = ({
  id,
  name,
  address,
  phone,
  image,
  cuisines,
  deliveryTime,
  minimumOrder,
  longitude,
  latitude,
  categories
}) => ({
  _id: id,
  orderId: id,
  orderPrefix: name.slice(0, 3).toUpperCase(),
  name,
  image,
  logo: IMG.logo,
  address,
  location: { coordinates: [longitude, latitude] },
  deliveryTime,
  minimumOrder,
  tax: 8,
  shopType: 'restaurant',
  cuisines,
  tags: cuisines,
  reviewCount: 24,
  reviewAverage: 4.6,
  reviewData: { total: 24, ratings: 4.6 },
  freeDelivery: false,
  acceptVouchers: true,
  isAvailable: true,
  phone,
  restaurantUrl: '',
  stripeDetailsSubmitted: false,
  openingTimes: OPENING_TIMES,
  options: [],
  addons: [],
  zone: { _id: 'jedzto-zone-myslenice', title: 'Myślenice', tax: 8 },
  rating: 4.6,
  categories
})

export const JEDZTO_LOCAL_CUISINES = [
  { _id: 'c-pizza', name: 'Pizza', description: 'Pizzerie', image: IMG.pizza, shopType: 'restaurant' },
  { _id: 'c-burgery', name: 'Burgery', description: 'Burgery', image: IMG.burger, shopType: 'restaurant' },
  { _id: 'c-chinska', name: 'Chińska', description: 'Kuchnia azjatycka', image: IMG.chinese, shopType: 'restaurant' },
  { _id: 'c-kurczak', name: 'Kurczak', description: 'Chicken', image: IMG.chicken, shopType: 'restaurant' },
  { _id: 'c-wloska', name: 'Włoska', description: 'Kuchnia włoska', image: IMG.pizza2, shopType: 'restaurant' }
]

export const JEDZTO_LOCAL_RESTAURANTS = [
  restaurant({
    id: 'jedzto-pizzeria-zielona',
    name: 'Pizzeria Zielona',
    address: 'ul. Handlowa 12, 32-440 Sułkowice',
    phone: '+48123450001',
    image: IMG.pizza,
    cuisines: ['Pizza', 'Włoska'],
    deliveryTime: 35,
    minimumOrder: 30,
    longitude: 19.8011,
    latitude: 49.8408,
    categories: [
      category('Pizza', [
        food('Margherita', 'Sos pomidorowy, mozzarella, bazylia', 29, IMG.pizza),
        food('Capricciosa', 'Szynka, pieczarki, oliwki, karczochy', 38, IMG.pizza),
        food('Pepperoni', 'Salami pepperoni, mozzarella, oregano', 36, IMG.pizza),
        food('Zielona Special', 'Szpinak, feta, pomidorki koktajlowe, pesto', 39, IMG.pizza),
        food('Hawajska', 'Szynka, ananas, mozzarella', 35, IMG.pizza)
      ]),
      category('Dodatki', [
        food('Sos czosnkowy', 'Domowy sos czosnkowy 50 ml', 4),
        food('Sos BBQ', 'Słodko-pikantny BBQ 50 ml', 4),
        food('Frytki', 'Chrupiące frytki 200 g', 12)
      ]),
      category('Napoje', [
        food('Cola 0,5 l', 'Napój gazowany', 8),
        food('Woda niegazowana 0,5 l', 'Woda mineralna', 6)
      ])
    ]
  }),
  restaurant({
    id: 'jedzto-pizza-italiana',
    name: 'Pizza Italiana',
    address: 'Jawornik 48, 32-400 Myślenice',
    phone: '+48123450002',
    image: IMG.pizza2,
    cuisines: ['Pizza', 'Włoska'],
    deliveryTime: 40,
    minimumOrder: 35,
    longitude: 19.885,
    latitude: 49.876,
    categories: [
      category('Pizza klasyczna', [
        food('Napoletana', 'Sos San Marzano, mozzarella fior di latte, bazylia', 34, IMG.pizza2),
        food('Quattro Formaggi', 'Mozzarella, gorgonzola, parmezan, ricotta', 42, IMG.pizza2),
        food('Diavola', 'Salami pikantne, chili, mozzarella', 39, IMG.pizza2),
        food('Prosciutto e Funghi', 'Prosciutto cotto, pieczarki, oregano', 40, IMG.pizza2)
      ]),
      category('Pasta', [
        food('Spaghetti Bolognese', 'Sos wołowy, parmezan', 32),
        food('Penne Arrabbiata', 'Pikantny sos pomidorowy, czosnek', 28),
        food('Tagliatelle Alfredo', 'Kremowy sos, kurczak, parmezan', 34)
      ]),
      category('Desery', [
        food('Tiramisu', 'Klasyczny deser włoski', 18),
        food('Panna Cotta', 'Z sosem owocowym', 16)
      ])
    ]
  }),
  restaurant({
    id: 'jedzto-pod-blacha',
    name: 'Chińczyk Pod Blachą',
    address: 'ul. Jana Pawła II 7, 32-400 Myślenice',
    phone: '+48123450003',
    image: IMG.chinese,
    cuisines: ['Chińska', 'Azjatycka'],
    deliveryTime: 30,
    minimumOrder: 25,
    longitude: 19.9381,
    latitude: 49.8339,
    categories: [
      category('Zupy', [
        food('Zupa kwaśno-pikantna', 'Tradycyjna zupa Szechuan', 16, IMG.chinese),
        food('Zupa wonton', 'Pierogi wonton w bulionie', 18, IMG.chinese)
      ]),
      category('Dania główne', [
        food('Kurczak słodko-kwaśny', 'Z ananasem i papryką, ryż', 29, IMG.chinese),
        food('Kaczka po pekińsku (porcja)', 'Z naleśnikami i sosem hoisin', 45, IMG.chinese),
        food('Wołowina z brokułami', 'W sosie ostrygowym, ryż', 34, IMG.chinese),
        food('Smażony makaron z warzywami', 'Makaron chow mein, sos sojowy', 26, IMG.chinese),
        food('Ryż smażony z jajkiem', 'Klasyczny ryż po chińsku', 22, IMG.chinese)
      ]),
      category('Przekąski', [
        food('Sajgonki 4 szt.', 'Z sosem słodko-kwaśnym', 16),
        food('Pierogi na parze 6 szt.', 'Z mięsem wieprzowym', 18)
      ])
    ]
  }),
  restaurant({
    id: 'jedzto-burger-przedmiescie',
    name: 'Burger Przedmieście',
    address: 'ul. Przedmieście 3, 32-400 Myślenice',
    phone: '+48123450004',
    image: IMG.burger,
    cuisines: ['Burgery', 'Amerykańska'],
    deliveryTime: 25,
    minimumOrder: 28,
    longitude: 19.9425,
    latitude: 49.8355,
    categories: [
      category('Burgery', [
        food('Classic Cheeseburger', 'Wołowina 150 g, cheddar, sałata, sos house', 28, IMG.burger),
        food('Przedmieście Smash', 'Podwójny smash, bekon, majonez czosnkowy', 36, IMG.burger),
        food('BBQ Bacon', 'Wołowina, bekon, cebula prażona, BBQ', 34, IMG.burger),
        food('Vege Falafel Burger', 'Kotlet falafel, hummus, pikle', 27, IMG.burger),
        food('Chicken Burger', 'Chrupiący kurczak, colesław, majonez', 29, IMG.burger)
      ]),
      category('Zestawy', [
        food('Zestaw Classic', 'Cheeseburger + frytki + napój', 39, IMG.burger),
        food('Zestaw Smash', 'Smash + frytki + napój', 46, IMG.burger)
      ]),
      category('Dodatki', [
        food('Frytki belgijskie', 'Grube frytki 200 g', 12),
        food('Krążki cebulowe', '6 szt. z dipem', 14),
        food('Nuggetsy 6 szt.', 'Z sosem do wyboru', 16)
      ])
    ]
  }),
  restaurant({
    id: 'jedzto-chicken-n-bite',
    name: 'Chicken N Bite',
    address: 'ul. 3 Maja 15, 32-400 Myślenice',
    phone: '+48123450005',
    image: IMG.chicken,
    cuisines: ['Kurczak', 'Fast food'],
    deliveryTime: 25,
    minimumOrder: 25,
    longitude: 19.935,
    latitude: 49.832,
    categories: [
      category('Chicken boxes', [
        food('Box 4 strips', '4 stripsy, frytki, sos', 27, IMG.chicken),
        food('Box 6 strips', '6 stripsów, frytki, 2 sosy', 34, IMG.chicken),
        food('Box skrzydełek 8 szt.', 'Skrzydełka w sosie buffalo / BBQ', 32, IMG.chicken),
        food('Family Box', '12 stripsów, duże frytki, 3 sosy', 59, IMG.chicken)
      ]),
      category('Wrapy i sałatki', [
        food('Wrap Classic', 'Kurczak, sałata, sos ranch', 24, IMG.chicken),
        food('Wrap Spicy', 'Kurczak ostry, jalapeño, sos chili', 25, IMG.chicken),
        food('Sałatka Caesar z kurczakiem', 'Grillowany kurczak, parmezan, grzanki', 28, IMG.chicken)
      ]),
      category('Sosy i napoje', [
        food('Sos ranch', '50 ml', 3),
        food('Sos ostry', '50 ml', 3),
        food('Napój 0,5 l', 'Cola / Fanta / Sprite', 8)
      ])
    ]
  })
]

/** Preview card shape used by Discovery / Menu lists. */
export const getJedzToLocalRestaurantPreviews = () =>
  JEDZTO_LOCAL_RESTAURANTS.map((r) => ({
    _id: r._id,
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
  }))

export const getJedzToLocalRestaurantById = (id) =>
  JEDZTO_LOCAL_RESTAURANTS.find((r) => r._id === id) || null

export const isJedzToLocalRestaurantId = (id) =>
  typeof id === 'string' && id.startsWith('jedzto-')
