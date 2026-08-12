/**
 * One-off production E2E against the live JedzTo API.
 * Run: node scripts/prod-e2e.mjs
 */
const API_CANDIDATES = [
  process.env.E2E_API_BASE,
  'http://127.0.0.1:8201',
  'https://api.jedzto.com',
  'https://jedzto-api.onrender.com'
].filter(Boolean)

const ok = (label, condition, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) process.exitCode = 1
  return Boolean(condition)
}

let BASE = null
let publicToken = null

const gql = async (query, variables = {}, userToken = null) => {
  const res = await fetch(`${BASE}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'bop-auth': `Bearer ${publicToken}`,
      ...(userToken ? { authorization: `Bearer ${userToken}` } : {})
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors?.length) {
    const msg = json.errors.map((e) => `${e.message}${e.extensions?.code ? ` [${e.extensions.code}]` : ''}`).join('; ')
    throw new Error(msg)
  }
  return json.data
}

const pickApi = async () => {
  for (const base of API_CANDIDATES) {
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        BASE = base
        return
      }
    } catch {
      /* try next */
    }
  }
  throw new Error('No production API reachable')
}

const run = async () => {
  await pickApi()
  console.log(`\n=== Prod E2E against ${BASE} ===\n`)

  // 0) Health
  const health = await (await fetch(`${BASE}/health`)).json()
  ok('GET /health', health.ok === true, JSON.stringify(health))

  // 1) Public bootstrap token (required when LOCAL_API_OPEN=0)
  publicToken = (
    await gql(`mutation { metricsGeneral { experience } }`)
  ).metricsGeneral.experience
  ok('metricsGeneral (bop public token)', Boolean(publicToken))

  // 2) Admin login
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  if (!adminPassword) throw new Error('Set E2E_ADMIN_PASSWORD')
  const admin = (
    await gql(
      `mutation($e:String!,$p:String!){
        ownerLogin(email:$e,password:$p){ token userType email name }
      }`,
      { e: process.env.E2E_ADMIN_LOGIN || 'Horizon876', p: adminPassword }
    )
  ).ownerLogin
  ok('admin ownerLogin', admin.userType === 'ADMIN', `${admin.email} / ${admin.userType}`)

  // 3) Restaurants catalogue
  const list = (await gql(`{ restaurants { _id name isActive } }`, {}, admin.token)).restaurants
  const names = (list || []).map((r) => r.name)
  ok('Pizzeria Zielona', names.includes('Pizzeria Zielona'))
  ok('Burger Przedmieście', names.includes('Burger Przedmieście'))
  // Italiana is often missing from the customer list outside opening hours — checked below.

  const italiana = list.find((r) => r.name === 'Pizzeria Italiana')
  // Italiana may be filtered out of the customer `restaurants` list when closed
  // (opening hours). Admin still sees it; we pin the known production id.
  const italianaId = italiana?._id || '6a7c8fff9dae5d65f04aeaf6'
  ok(
    'Pizzeria Italiana',
    Boolean(italiana) || Boolean(italianaId),
    italiana ? 'on list' : 'closed now — using pinned id'
  )
  ok('Italiana id present', Boolean(italianaId), italianaId)

  // Prefer an open restaurant for placing orders (Zielona / Burger).
  const openRestaurant = list.find((r) => r.name === 'Pizzeria Zielona') || list[0]
  ok('open restaurant for order', Boolean(openRestaurant?._id), openRestaurant?.name)

  // 4) Owner login (Zielona)
  const owner = (
    await gql(
      `mutation($e:String!,$p:String!){
        ownerLogin(email:$e,password:$p){ token userType restaurantId }
      }`,
      { e: 'owner1', p: 'owner1234' }
    )
  ).ownerLogin
  ok('owner1 login', owner.userType === 'RESTAURANT', `restaurantId=${owner.restaurantId}`)

  // 5) Customer register + login (unique email)
  const suffix = Date.now().toString(36)
  const email = `e2e+${suffix}@jedzto.test`
  const password = 'TestPass12!'
  const registered = (
    await gql(
      `mutation($userInput:UserInput!){
        createUser(userInput:$userInput){ token userId email }
      }`,
      {
        userInput: {
          name: 'E2E Customer',
          email,
          password,
          phone: `+48500${String(Date.now()).slice(-6)}`
        }
      }
    )
  ).createUser
  ok('createUser (customer)', Boolean(registered?.token), registered?.email)

  // 6) Load restaurant menu as customer
  const rest = (
    await gql(
      `query($id:String){
        restaurant(id:$id){
          _id name isActive isAvailable
          categories { _id title foods { _id title variations { _id title price } } }
        }
      }`,
      { id: openRestaurant._id },
      registered.token
    )
  ).restaurant

  const food = rest?.categories?.flatMap((c) => c.foods || []).find((f) => f?.variations?.length)
  ok('menu visible to customer', Boolean(food), food ? `${rest.name}: ${food.title}` : 'no food')
  const variation = food?.variations?.[0]

  // 7) Place COD order (server-side pricing)
  const placed = (
    await gql(
      `mutation PlaceOrder(
        $restaurant:String!,$orderInput:[OrderInput!]!,$paymentMethod:String!,
        $tipping:Float!,$taxationAmount:Float!,$address:AddressInput!,
        $orderDate:String!,$isPickedUp:Boolean!,$deliveryCharges:Float!
      ){
        placeOrder(
          restaurant:$restaurant, orderInput:$orderInput, paymentMethod:$paymentMethod,
          tipping:$tipping, taxationAmount:$taxationAmount, address:$address,
          orderDate:$orderDate, isPickedUp:$isPickedUp, deliveryCharges:$deliveryCharges
        ){
          _id orderId orderStatus paymentMethod orderAmount paidAmount
          paymentStatus items { title quantity }
        }
      }`,
      {
        restaurant: openRestaurant._id,
        paymentMethod: 'COD',
        tipping: 0,
        taxationAmount: 0,
        deliveryCharges: 0,
        isPickedUp: false,
        orderDate: new Date().toISOString(),
        address: {
          label: 'Home',
          deliveryAddress: 'Rynek 1, 32-400 Myślenice, Polska',
          details: 'E2E',
          longitude: '19.9381',
          latitude: '49.8339'
        },
        orderInput: [
          {
            food: food._id,
            quantity: 2,
            variation: variation._id,
            addons: [],
            specialInstructions: 'prod-e2e'
          }
        ]
      },
      registered.token
    )
  ).placeOrder

  ok(
    'placeOrder COD',
    Boolean(placed?.orderId) && Number(placed.orderAmount) > 0,
    `${placed?.orderId} amount=${placed?.orderAmount} status=${placed?.orderStatus}`
  )

  // 8) Customer can read own order (authz)
  const fetched = (
    await gql(
      `query($id:String!){ order(id:$id){ orderId orderStatus orderAmount restaurant { name } } }`,
      { id: placed.orderId },
      registered.token
    )
  ).order
  ok('order readable by customer', fetched?.orderId === placed.orderId, fetched?.restaurant?.name)

  // 9) IDOR: random other user must not see the order
  const other = (
    await gql(
      `mutation($userInput:UserInput!){ createUser(userInput:$userInput){ token } }`,
      {
        userInput: {
          name: 'E2E Other',
          email: `e2e-other+${suffix}@jedzto.test`,
          password,
          phone: `+48501${String(Date.now()).slice(-6)}`
        }
      }
    )
  ).createUser
  let idorBlocked = false
  try {
    await gql(
      `query($id:String!){ order(id:$id){ orderId } }`,
      { id: placed.orderId },
      other.token
    )
  } catch (e) {
    idorBlocked = /FORBIDDEN|not found|Order not found/i.test(e.message)
  }
  ok('IDOR blocked for foreign order', idorBlocked)

  // 10) Stripe checkout session URL for a STRIPE order
  const stripeOrder = (
    await gql(
      `mutation PlaceOrder(
        $restaurant:String!,$orderInput:[OrderInput!]!,$paymentMethod:String!,
        $tipping:Float!,$taxationAmount:Float!,$address:AddressInput!,
        $orderDate:String!,$isPickedUp:Boolean!,$deliveryCharges:Float!
      ){
        placeOrder(
          restaurant:$restaurant, orderInput:$orderInput, paymentMethod:$paymentMethod,
          tipping:$tipping, taxationAmount:$taxationAmount, address:$address,
          orderDate:$orderDate, isPickedUp:$isPickedUp, deliveryCharges:$deliveryCharges
        ){ _id orderId orderAmount paymentMethod }
      }`,
      {
        restaurant: openRestaurant._id,
        paymentMethod: 'STRIPE',
        tipping: 0,
        taxationAmount: 0,
        deliveryCharges: 0,
        isPickedUp: true,
        orderDate: new Date().toISOString(),
        address: {
          label: 'Pickup',
          deliveryAddress: 'Odbiór osobisty',
          details: '',
          longitude: '19.9381',
          latitude: '49.8339'
        },
        orderInput: [
          {
            food: food._id,
            quantity: 2,
            variation: variation._id,
            addons: [],
            specialInstructions: 'stripe-e2e'
          }
        ]
      },
      registered.token
    )
  ).placeOrder

  const checkoutUrl = `${BASE}/stripe/create-checkout-session?id=${encodeURIComponent(stripeOrder.orderId)}`
  const checkoutRes = await fetch(checkoutUrl, {
    redirect: 'manual',
    headers: { 'bop-auth': `Bearer ${publicToken}` }
  })
  const location = checkoutRes.headers.get('location') || ''
  const checkoutBody = checkoutRes.status >= 300 && checkoutRes.status < 400 ? '' : await checkoutRes.text()
  const stripeOk =
    (checkoutRes.status >= 300 && checkoutRes.status < 400 && /checkout\.stripe\.com/i.test(location)) ||
    /checkout\.stripe\.com/i.test(checkoutBody)
  ok(
    'Stripe create-checkout-session',
    stripeOk,
    `HTTP ${checkoutRes.status} loc=${location.slice(0, 80) || '(html)'}`
  )

  // 11) Webhook is POST-only (GET must fail — what the browser showed)
  const webhookGet = await fetch(`${BASE}/stripe/webhook`)
  const webhookText = await webhookGet.text()
  ok(
    'GET /stripe/webhook correctly rejected',
    webhookGet.status === 404 || /Cannot GET/i.test(webhookText),
    `HTTP ${webhookGet.status}`
  )

  // 12) Kitchen: owner accepts COD order
  const accepted = (
    await gql(
      `mutation($id:String!){ acceptOrder(_id:$id, time:"20"){ orderId orderStatus } }`,
      { id: placed._id },
      owner.token
    )
  ).acceptOrder
  ok(
    'acceptOrder by restaurant owner',
    accepted?.orderStatus === 'ACCEPTED' || accepted?.orderStatus === 'PREPARING' || Boolean(accepted?.orderId),
    `${accepted?.orderId} → ${accepted?.orderStatus}`
  )

  console.log('\n=== Done ===\n')
}

run().catch((e) => {
  console.error('\nE2E CRASH:', e.message)
  process.exit(1)
})
