// Verify placeOrder + updateStatus notify both customer and restaurant owner
// via orderStatusChanged (using a short-lived graphql-ws subscription).
import { createClient } from 'graphql-ws'
import WebSocket from 'ws'

const HTTP = 'http://127.0.0.1:8001/graphql'
const WS = 'ws://127.0.0.1:8001/graphql'

const gqlHttp = async (query, variables = {}, token) => {
  const res = await fetch(HTTP, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

const waitForEvent = (userId, token, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const client = createClient({
      url: WS,
      webSocketImpl: WebSocket,
      connectionParams: { authorization: `Bearer ${token}` }
    })
    const timer = setTimeout(() => {
      client.dispose()
      reject(new Error(`timeout waiting for orderStatusChanged userId=${userId}`))
    }, timeoutMs)

    const unsubscribe = client.subscribe(
      {
        query: `subscription($userId:String!){
          orderStatusChanged(userId:$userId){
            userId origin order { _id orderStatus }
          }
        }`,
        variables: { userId }
      },
      {
        next: (msg) => {
          console.log('WS next', JSON.stringify(msg))
          const payload = msg?.data?.orderStatusChanged
          if (!payload?.order?._id) return
          clearTimeout(timer)
          unsubscribe()
          client.dispose()
          resolve(payload)
        },
        error: (err) => {
          clearTimeout(timer)
          client.dispose()
          reject(err)
        },
        complete: () => {}
      }
    )
  })

const run = async () => {
  const owner = (
    await gqlHttp(
      `mutation($e:String!,$p:String!){ ownerLogin(email:$e,password:$p){ token userId restaurantId } }`,
      { e: 'owner1@jedzto.local', p: 'owner1234' }
    )
  ).ownerLogin

  const cust = (
    await gqlHttp(
      `mutation{ login(email:"demo@jedzto.local", password:"demo1234", type:"email"){ token userId } }`
    )
  ).login

  const menu = await gqlHttp(
    `query($id:String){ restaurant(id:$id){ categories{ foods{ _id variations{ _id } } } } }`,
    { id: owner.restaurantId },
    owner.token
  )
  const food = menu.restaurant.categories[0].foods[0]
  const variation = food.variations[0]

  const ownerWait = waitForEvent(owner.userId, owner.token)
  // Give the subscription a moment to attach before placing.
  await new Promise((r) => setTimeout(r, 400))

  const placePromise = gqlHttp(
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
      ){ _id orderStatus }
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
        deliveryAddress: 'Rynek 1',
        details: '',
        longitude: String(19.9381),
        latitude: String(49.8339)
      },
      orderInput: [
        { food: String(food._id), variation: String(variation._id), quantity: 1, addons: [] }
      ]
    },
    cust.token
  )

  const [ownerEvent, placed] = await Promise.all([ownerWait, placePromise])
  console.log('owner got placeOrder event', ownerEvent?.order?.orderStatus, ownerEvent?.origin)

  const custWait = waitForEvent(cust.userId, cust.token)
  await new Promise((r) => setTimeout(r, 400))

  const acceptPromise = gqlHttp(
    `mutation($id:String!,$orderStatus:String!){ updateStatus(id:$id,orderStatus:$orderStatus){ _id orderStatus } }`,
    { id: placed.placeOrder._id, orderStatus: 'ACCEPTED' },
    owner.token
  )

  const [custEvent, accepted] = await Promise.all([custWait, acceptPromise])
  console.log('customer got updateStatus event', custEvent?.order?.orderStatus, custEvent?.origin)
  console.log('accept result', accepted.updateStatus.orderStatus)
  console.log('LIVE UPDATES OK')
}

run().catch((e) => {
  console.error('FAIL', e.message || e)
  process.exit(1)
})
