// Ad-hoc smoke test for the delivery-area + menu-publishing work.
// Usage: node scripts/smoke-delivery.mjs
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
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2))
  return json.data
}

const PLACES = {
  'Myślenice': { latitude: 49.8339, longitude: 19.9381 },
  'Jawornik': { latitude: 49.8858, longitude: 19.9314 },
  'Rudnik': { latitude: 49.8067, longitude: 19.8686 }
}

const login = (email, password) =>
  gql(
    `mutation($email:String!,$password:String!){
      ownerLogin(email:$email,password:$password){
        token userType userTypeId restaurantId shopType permissions name
      }
    }`,
    { email, password }
  )

const run = async () => {
  console.log('--- 1. Logowanie ---')
  const admin = (await login('admin@jedzto.local', 'admin1234')).ownerLogin
  console.log(`admin   -> userType=${admin.userType} userTypeId=${admin.userTypeId}`)
  const owner = (await login('owner2@jedzto.local', 'owner1234')).ownerLogin
  console.log(
    `owner2  -> userType=${owner.userType} restaurantId=${owner.restaurantId} shopType=${owner.shopType}`
  )

  console.log('\n--- 2. Restauracje widoczne pod adresem ---')
  for (const [place, coords] of Object.entries(PLACES)) {
    const data = await gql(
      `query($lat:Float,$lng:Float){
        nearByRestaurantsPreview(latitude:$lat,longitude:$lng){
          restaurants{ name deliveryFee deliveryAreaName }
        }
      }`,
      { lat: coords.latitude, lng: coords.longitude }
    )
    const list = data.nearByRestaurantsPreview.restaurants
    const summary = list.length
      ? list.map((r) => `${r.name} (${r.deliveryAreaName}: ${r.deliveryFee} zł)`).join(', ')
      : 'BRAK RESTAURACJI'
    console.log(`${place.padEnd(12)} -> ${summary}`)
  }

  console.log('\n--- 3. Wycena dostawy dla Burger Przedmieście ---')
  for (const [place, coords] of Object.entries(PLACES)) {
    const data = await gql(
      `query($id:ID!,$lat:Float!,$lng:Float!){
        deliveryQuote(restaurantId:$id,latitude:$lat,longitude:$lng){
          available fee minOrder areaName
        }
      }`,
      { id: owner.restaurantId, lat: coords.latitude, lng: coords.longitude }
    )
    const q = data.deliveryQuote
    console.log(
      `${place.padEnd(12)} -> ${q.available ? `${q.fee} zł (${q.areaName}, min. ${q.minOrder} zł)` : 'nie dowozimy'}`
    )
  }

  console.log('\n--- 4. Publikacja menu ---')
  const status = await gql(
    `query($id:ID!){ menuPublishStatus(restaurantId:$id){
      publishedCategories publishedItems hasUnpublishedMenuChanges menuPublishedAt } }`,
    { id: owner.restaurantId },
    owner.token
  )
  console.log(status.menuPublishStatus)

  console.log('\n--- 5. Statystyki administratora ---')
  const stats = await gql(
    `query{ getDashboardUsers{ usersCount vendorsCount restaurantsCount ridersCount } }`,
    {},
    admin.token
  )
  console.log(stats.getDashboardUsers)
}

run().catch((e) => {
  console.error('SMOKE TEST FAILED\n', e.message, e.cause || '')
  process.exit(1)
})
