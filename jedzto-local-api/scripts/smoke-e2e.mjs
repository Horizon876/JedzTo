// End-to-end check of the vendor/admin workflow:
//   admin creates a restaurant + owner account
//   -> owner logs in, uploads an image, builds a menu, sets delivery areas
//   -> customer app sees the restaurant only inside those areas
//   -> menu stays hidden until the owner publishes it
//
// Usage: node scripts/smoke-e2e.mjs
const API = 'http://127.0.0.1:8001/graphql'

const gql = async (query, variables = {}, token) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors.map((e) => e.message)))
  return json.data
}

const login = async (email, password) =>
  (
    await gql(
      `mutation($email:String!,$password:String!){
        ownerLogin(email:$email,password:$password){ token userType userTypeId restaurantId }
      }`,
      { email, password }
    )
  ).ownerLogin

// 1x1 transparent PNG.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) process.exitCode = 1
}

const restaurantsAt = async (latitude, longitude) => {
  const data = await gql(
    `query($lat:Float,$lng:Float){
      nearByRestaurantsPreview(latitude:$lat,longitude:$lng){
        restaurants{ _id name deliveryFee deliveryAreaName }
      }
    }`,
    { lat: latitude, lng: longitude }
  )
  return data.nearByRestaurantsPreview.restaurants
}

const run = async () => {
  const admin = await login('admin@jedzto.local', 'admin1234')

  console.log('\n[1] Administrator tworzy restaurację wraz z kontem właściciela')
  const suffix = Date.now().toString().slice(-6)
  const ownerEmail = `wlasciciel${suffix}@jedzto.local`
  const created = (
    await gql(
      `mutation($restaurant:RestaurantInput!,$ownerName:String!,$ownerEmail:String!){
        createRestaurant(restaurant:$restaurant,ownerName:$ownerName,ownerEmail:$ownerEmail){
          restaurant{ _id name }
          owner{ email temporaryPassword role restaurantId }
        }
      }`,
      {
        restaurant: {
          name: `Kebab Testowy ${suffix}`,
          address: 'Rynek 5, 32-400 Myślenice',
          phone: '+48500600700',
          shopType: 'restaurant',
          deliveryTime: 30,
          minimumOrder: 25,
          cuisines: ['Kebab']
        },
        ownerName: 'Testowy Właściciel',
        ownerEmail
      },
      admin.token
    )
  ).createRestaurant

  const restaurantId = created.restaurant._id
  const tempPassword = created.owner.temporaryPassword
  ok('restauracja utworzona', Boolean(restaurantId), created.restaurant.name)
  ok('wygenerowano dane logowania', Boolean(tempPassword), `${created.owner.email} / ${tempPassword}`)

  console.log('\n[2] Właściciel loguje się wygenerowanym hasłem')
  const owner = await login(ownerEmail, tempPassword)
  ok('typ konta to RESTAURANT', owner.userType === 'RESTAURANT', owner.userType)
  ok(
    'panel dostaje id swojej restauracji',
    owner.userTypeId === restaurantId,
    `userTypeId=${owner.userTypeId}`
  )

  console.log('\n[3] Właściciel dodaje kategorię i danie ze zdjęciem')
  const upload = await gql(
    `mutation($image:String!){ uploadImageToS3(image:$image){ imageUrl } }`,
    { image: TINY_PNG },
    owner.token
  )
  const imageUrl = upload.uploadImageToS3.imageUrl
  ok('zdjęcie wgrane', imageUrl.includes('/uploads/'), imageUrl)

  const withCategory = await gql(
    `mutation($category:CategoryInput!){ createCategory(category:$category){ _id categories{ _id title } } }`,
    { category: { title: 'Kebaby', restaurant: restaurantId } },
    owner.token
  )
  const categoryId = withCategory.createCategory.categories[0]._id

  await gql(
    `mutation($foodInput:FoodInput!){ createFood(foodInput:$foodInput){ _id } }`,
    {
      foodInput: {
        restaurant: restaurantId,
        category: categoryId,
        title: 'Kebab w bułce',
        description: 'Wołowina, sos czosnkowy',
        image: imageUrl,
        variations: [{ title: 'Standard', price: 24 }]
      }
    },
    owner.token
  )
  ok('kategoria i danie dodane', true)

  console.log('\n[4] Zmiany nie docierają do aplikacji przed publikacją')
  const beforePublish = await gql(
    `query($id:String){ restaurant(id:$id){ categories{ title foods{ title image } } } }`,
    { id: restaurantId }
  )
  ok(
    'aplikacja nie widzi jeszcze menu',
    beforePublish.restaurant.categories.length === 0,
    `kategorii: ${beforePublish.restaurant.categories.length}`
  )

  const status = await gql(
    `query($id:ID!){ menuPublishStatus(restaurantId:$id){ hasUnpublishedMenuChanges } }`,
    { id: restaurantId },
    owner.token
  )
  ok(
    'panel sygnalizuje niewysłane zmiany',
    status.menuPublishStatus.hasUnpublishedMenuChanges === true
  )

  // The panel's product/category screens use the same `restaurant` query as the
  // app, so the owner must still see their unpublished draft.
  const ownerView = await gql(
    `query($id:String){ restaurant(id:$id){ categories{ title foods{ title } } } }`,
    { id: restaurantId },
    owner.token
  )
  ok(
    'właściciel widzi w panelu swoją wersję roboczą',
    ownerView.restaurant.categories[0]?.foods[0]?.title === 'Kebab w bułce',
    `kategorii: ${ownerView.restaurant.categories.length}`
  )

  console.log('\n[5] Właściciel klika "Wyślij do aplikacji"')
  const published = await gql(
    `mutation($id:ID!){ publishMenu(restaurantId:$id){ publishedCategories publishedItems hasUnpublishedMenuChanges } }`,
    { id: restaurantId },
    owner.token
  )
  ok(
    'menu opublikowane',
    published.publishMenu.publishedCategories === 1 && published.publishMenu.publishedItems === 1,
    JSON.stringify(published.publishMenu)
  )

  const afterPublish = await gql(
    `query($id:String){ restaurant(id:$id){ categories{ title foods{ title image } } } }`,
    { id: restaurantId }
  )
  const publishedFood = afterPublish.restaurant.categories[0]?.foods[0]
  ok('aplikacja widzi danie', publishedFood?.title === 'Kebab w bułce', publishedFood?.title)
  ok('danie ma zdjęcie', publishedFood?.image === imageUrl)

  console.log('\n[6] Właściciel ustala obszary dostaw: Myślenice 0 zł, Jawornik 4 zł')
  await gql(
    `mutation($restaurantId:ID!,$areas:[DeliveryAreaInput!]!){
      updateDeliveryAreas(restaurantId:$restaurantId,areas:$areas){ _id deliveryAreas{ name fee } }
    }`,
    {
      restaurantId,
      areas: [
        { name: 'Myślenice', fee: 0, minOrder: 25, latitude: 49.8339, longitude: 19.9381, radiusKm: 4 },
        { name: 'Jawornik', fee: 4, minOrder: 30, latitude: 49.8858, longitude: 19.9314, radiusKm: 2.5 }
      ]
    },
    owner.token
  )

  const inMyslenice = (await restaurantsAt(49.8339, 19.9381)).find((r) => r._id === restaurantId)
  const inJawornik = (await restaurantsAt(49.8858, 19.9314)).find((r) => r._id === restaurantId)
  const inRudnik = (await restaurantsAt(49.8067, 19.8686)).find((r) => r._id === restaurantId)

  ok('Myślenice: dostawa 0 zł', inMyslenice?.deliveryFee === 0, `${inMyslenice?.deliveryFee} zł`)
  ok('Jawornik: dostawa 4 zł', inJawornik?.deliveryFee === 4, `${inJawornik?.deliveryFee} zł`)
  ok('Rudnik: restauracja niewidoczna', inRudnik === undefined)

  console.log('\n[7] Odrzucanie nieprawidłowych obszarów')
  let rejected = false
  try {
    await gql(
      `mutation($restaurantId:ID!,$areas:[DeliveryAreaInput!]!){
        updateDeliveryAreas(restaurantId:$restaurantId,areas:$areas){ _id }
      }`,
      {
        restaurantId,
        areas: [
          { name: 'Myślenice', fee: 0, latitude: 49.83, longitude: 19.93, radiusKm: 4 },
          { name: 'myslenice', fee: 5, latitude: 49.83, longitude: 19.93, radiusKm: 4 }
        ]
      },
      owner.token
    )
  } catch {
    rejected = true
  }
  ok('duplikat nazwy obszaru odrzucony', rejected)

  console.log('\n[8] Właściciel nie może ruszać cudzej restauracji')
  const otherOwner = await login('owner1@jedzto.local', 'owner1234')
  let blocked = false
  try {
    await gql(
      `mutation($id:ID!){ publishMenu(restaurantId:$id){ restaurantId } }`,
      { id: restaurantId },
      otherOwner.token
    )
  } catch {
    blocked = true
  }
  ok('publikacja cudzego menu zablokowana', blocked)

  console.log('\n[9] Statystyki')
  const adminStats = await gql(
    `query{ getDashboardUsers{ restaurantsCount vendorsCount }
            getDashboardOrdersByType{ label value } }`,
    {},
    admin.token
  )
  ok(
    'admin widzi liczbę restauracji',
    adminStats.getDashboardUsers.restaurantsCount >= 3,
    `${adminStats.getDashboardUsers.restaurantsCount} restauracji`
  )

  const storeStats = await gql(
    `query($id:String!,$from:String!,$to:String!){
      getRestaurantDashboardOrderSalesDetailsByPaymentMethod(restaurant:$id,starting_date:$from,ending_date:$to){
        total_orders total_sales
      }
    }`,
    { id: restaurantId, from: '2020-01-01', to: '2030-01-01' },
    owner.token
  )
  ok(
    'właściciel widzi statystyki swojego sklepu',
    storeStats.getRestaurantDashboardOrderSalesDetailsByPaymentMethod !== null,
    JSON.stringify(storeStats.getRestaurantDashboardOrderSalesDetailsByPaymentMethod)
  )

  console.log(
    process.exitCode ? '\nNIEKTÓRE TESTY NIE PRZESZŁY' : '\nWSZYSTKIE TESTY PRZESZŁY'
  )
}

run().catch((e) => {
  console.error('\nBŁĄD TESTU:', e.message)
  process.exit(1)
})
