// Quick kitchen flow smoke: owner login -> seed pending order -> accept/send/receive
const API = 'http://127.0.0.1:8001/graphql'

const gql = async (query, variables = {}, token) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

const run = async () => {
  const login = await gql(
    `mutation($e:String!,$p:String!){ ownerLogin(email:$e,password:$p){ token restaurantId userType } }`,
    { e: 'owner1@jedzto.local', p: 'owner1234' }
  )
  const { token, restaurantId } = login.ownerLogin
  console.log('owner login OK', restaurantId)

  // Create a pending order through the customer login + placeOrder shape used by the app.
  const customer = await gql(
    `mutation{ login(email:"demo@jedzto.local", password:"demo1234", type:"email"){ token } }`
  )
  const customerToken = customer.login.token

  const menu = await gql(
    `query($id:String){ restaurant(id:$id){ categories { foods { _id title variations { _id title price } } } } }`,
    { id: restaurantId },
    token
  )
  const food = menu.restaurant.categories[0].foods[0]
  const variation = food.variations[0]

  const placed = await gql(
    `mutation Place(
      $restaurant:String!
      $orderInput:[OrderInput!]!
      $paymentMethod:String!
      $couponCode:String
      $tipping:Float!
      $taxationAmount:Float!
      $address:AddressInput!
      $orderDate:String!
      $isPickedUp:Boolean!
      $deliveryCharges:Float!
    ){
      placeOrder(
        restaurant:$restaurant
        orderInput:$orderInput
        paymentMethod:$paymentMethod
        couponCode:$couponCode
        tipping:$tipping
        taxationAmount:$taxationAmount
        address:$address
        orderDate:$orderDate
        isPickedUp:$isPickedUp
        deliveryCharges:$deliveryCharges
      ){ _id orderId orderStatus }
    }`,
    {
      restaurant: restaurantId,
      paymentMethod: 'COD',
      couponCode: null,
      tipping: 0,
      taxationAmount: 0,
      deliveryCharges: 4,
      isPickedUp: false,
      orderDate: new Date().toISOString(),
      address: {
        label: 'Home',
        deliveryAddress: 'ul. Testowa 1, Myślenice',
        details: 'parter',
        longitude: String(19.9381),
        latitude: String(49.8339),
      },
      orderInput: [
        {
          food: String(food._id),
          quantity: 2,
          variation: String(variation._id),
          addons: [],
        },
      ],
    },
    customerToken
  )

  const orderId = placed.placeOrder._id
  console.log('placed', placed.placeOrder.orderStatus, orderId)

  const accept = await gql(
    `mutation($id:String!,$orderStatus:String!){ updateStatus(id:$id,orderStatus:$orderStatus){ orderStatus } }`,
    { id: orderId, orderStatus: 'ACCEPTED' },
    token
  )
  console.log('accept', accept.updateStatus.orderStatus)

  const sent = await gql(
    `mutation($id:String!,$orderStatus:String!){ updateStatus(id:$id,orderStatus:$orderStatus){ orderStatus } }`,
    { id: orderId, orderStatus: 'ASSIGNED' },
    token
  )
  console.log('sent', sent.updateStatus.orderStatus)

  const received = await gql(
    `mutation($id:String!,$orderStatus:String!){ updateStatus(id:$id,orderStatus:$orderStatus){ orderStatus } }`,
    { id: orderId, orderStatus: 'DELIVERED' },
    token
  )
  console.log('received', received.updateStatus.orderStatus)
  console.log('KITCHEN FLOW OK')
}

run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
