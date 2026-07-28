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

const run = async () => {
  const owner = (
    await gql(
      `mutation($e:String!,$p:String!){ ownerLogin(email:$e,password:$p){ token restaurantId } }`,
      { e: 'owner1@jedzto.local', p: 'owner1234' }
    )
  ).ownerLogin

  const cust = (
    await gql(
      `mutation{ login(email:"demo@jedzto.local", password:"demo1234", type:"email"){ token userId } }`
    )
  ).login

  const profile = await gql(
    `query{ profile{ _id name phone phoneIsVerified addresses{ deliveryAddress selected } } }`,
    {},
    cust.token
  )
  console.log('profile', JSON.stringify(profile.profile, null, 2))

  const menu = await gql(
    `query($id:String){ restaurant(id:$id){ _id name isAvailable isActive categories{ foods{ _id title variations{ _id title price } } } } }`,
    { id: owner.restaurantId },
    owner.token
  )
  console.log(
    'restaurant',
    menu.restaurant?.name,
    'foods',
    menu.restaurant?.categories?.flatMap((c) => c.foods?.length || 0)
  )

  const food = menu.restaurant.categories?.[0]?.foods?.[0]
  if (!food) throw new Error('No food on menu')
  const variation = food.variations[0]

  const placed = await gql(
    `mutation(
      $restaurant:String!
      $orderInput:[OrderInput!]!
      $paymentMethod:String!
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
        tipping:$tipping
        taxationAmount:$taxationAmount
        address:$address
        orderDate:$orderDate
        isPickedUp:$isPickedUp
        deliveryCharges:$deliveryCharges
      ){
        _id orderId orderStatus orderAmount
        user{ _id name email phone }
        restaurant{ _id name address }
        items{ title quantity variation{ title price } }
      }
    }`,
    {
      restaurant: owner.restaurantId,
      paymentMethod: 'COD',
      tipping: 0,
      taxationAmount: 0,
      deliveryCharges: 5,
      isPickedUp: false,
      orderDate: new Date().toISOString(),
      address: {
        label: 'Home',
        deliveryAddress: 'ul. Testowa 1, Myślenice',
        details: 'parter',
        longitude: String(19.9381),
        latitude: String(49.8339)
      },
      orderInput: [
        {
          food: String(food._id),
          variation: String(variation._id),
          quantity: 1,
          addons: []
        }
      ]
    },
    cust.token
  )

  console.log('PLACE OK', JSON.stringify(placed.placeOrder, null, 2))
}

run().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
