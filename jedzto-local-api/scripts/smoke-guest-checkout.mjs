const API = 'http://127.0.0.1:8001/graphql'

const gql = async (query, variables = {}) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

const run = async () => {
  const first = await gql(
    `mutation($name:String!,$phone:String!){ guestCheckout(name:$name,phone:$phone){ token userId name phone } }`,
    { name: 'Jan Kowalski', phone: '+48999888777' }
  )
  console.log('create', first.guestCheckout.name, first.guestCheckout.phone)

  const again = await gql(
    `mutation($name:String!,$phone:String!){ guestCheckout(name:$name,phone:$phone){ token userId name phone } }`,
    { name: 'Jan Nowak', phone: '+48999888777' }
  )
  console.log('reuse', again.guestCheckout.name, again.guestCheckout.userId === first.guestCheckout.userId)
  console.log('GUEST CHECKOUT OK')
}

run().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
