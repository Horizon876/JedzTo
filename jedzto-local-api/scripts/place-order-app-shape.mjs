// Reproduce the exact placeOrder mutation shape used by the mobile app.
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
  if (json.errors) {
    console.error('ERRORS', JSON.stringify(json.errors, null, 2))
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  return json.data
}

const PLACE_ORDER = `
  mutation PlaceOrder($restaurant:String!,$orderInput:[OrderInput!]!,$paymentMethod:String!,$couponCode:String,$tipping:Float!, $taxationAmount: Float!,$address:AddressInput!, $orderDate: String!,$isPickedUp: Boolean!, $deliveryCharges: Float!, $instructions: String){
    placeOrder(restaurant:$restaurant,orderInput: $orderInput,paymentMethod:$paymentMethod,couponCode:$couponCode,tipping:$tipping, taxationAmount: $taxationAmount, address:$address, orderDate: $orderDate,isPickedUp: $isPickedUp, deliveryCharges:$deliveryCharges, instructions: $instructions) {
      _id
      orderId
      restaurant{
        _id
        name
        image
        address
        location{coordinates}
      }
      deliveryAddress{
        location{coordinates}
        deliveryAddress
        id
      }
      items{
        _id
        title
        food
        description
        image
        quantity
        variation{
          _id
          title
          price
          discounted
        }
        addons{
          _id
          options{
            _id
            title
            description
            price
          }
          title
          description
          quantityMinimum
          quantityMaximum
        }
      }
      user{
        _id
        name
        phone
      }
      rider{
        _id
        name
      }
      review{
        _id
      }
      paymentMethod
      paidAmount
      orderAmount
      orderStatus
      tipping
      taxationAmount
      orderDate
      expectedTime
      isPickedUp
      deliveryCharges
      createdAt
      completionTime
      preparationTime
      acceptedAt
      pickedAt
      deliveredAt
      cancelledAt
      assignedAt
      instructions
      discountAmount
    }
  }
`

const run = async () => {
  const cust = (
    await gql(
      `mutation{ login(email:"demo@jedzto.local", password:"demo1234", type:"email"){ token } }`
    )
  ).login

  const owner = (
    await gql(
      `mutation($e:String!,$p:String!){ ownerLogin(email:$e,password:$p){ token restaurantId } }`,
      { e: 'owner1@jedzto.local', p: 'owner1234' }
    )
  ).ownerLogin

  // Customer-facing restaurant query (published menu + opening times)
  const rest = await gql(
    `query($id:String){ restaurant(id:$id){ _id name isAvailable openingTimes{ day times{ startTime endTime } } minimumOrder categories{ foods{ _id title variations{ _id title price } } } } }`,
    { id: owner.restaurantId },
    cust.token
  )
  console.log(
    'customer restaurant',
    rest.restaurant?.name,
    'isAvailable',
    rest.restaurant?.isAvailable,
    'cats',
    rest.restaurant?.categories?.length,
    'openingDays',
    rest.restaurant?.openingTimes?.length
  )

  const food = rest.restaurant.categories?.[0]?.foods?.[0]
  if (!food) throw new Error('No published food visible to customer')
  const variation = food.variations[0]

  // Same coercion the app does: longitude/latitude as strings
  const placed = await gql(
    PLACE_ORDER,
    {
      restaurant: owner.restaurantId,
      paymentMethod: 'COD',
      couponCode: null,
      tipping: 0,
      taxationAmount: 2.32,
      deliveryCharges: 6,
      isPickedUp: false,
      orderDate: new Date().toISOString(),
      instructions: '',
      address: {
        label: 'Home',
        deliveryAddress: 'Rynek 1, 32-400 Myślenice, Polska',
        details: '',
        longitude: '' + 19.9381,
        latitude: '' + 49.8339
      },
      orderInput: [
        {
          food: food._id,
          quantity: 2,
          variation: variation._id,
          addons: [],
          specialInstructions: ''
        }
      ]
    },
    cust.token
  )

  console.log('APP-SHAPE PLACE OK', placed.placeOrder.orderId, placed.placeOrder.orderStatus)
}

run().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
