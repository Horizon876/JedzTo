// Compares the GraphQL root fields the admin dashboard uses against the ones
// this API actually implements, so missing resolvers surface as a list instead
// of as runtime errors in the browser.
//
// Usage: node scripts/check-admin-coverage.mjs
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const ADMIN_GRAPHQL_DIR = resolve(
  process.cwd(),
  '../enatega-multivendor-admin/lib/api/graphql'
)
const API = 'http://127.0.0.1:8001/graphql'

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (entry.name.endsWith('.ts')) yield path
  }
}

// Pulls the first field inside `query Foo(...) { <field>` / `mutation ... {`.
const extractRootFields = (source) => {
  const fields = new Set()
  const blocks = source.matchAll(
    /\b(query|mutation|subscription)\s+\w*\s*(\([^)]*\))?\s*\{([\s\S]*?)\n\s*\}\s*`/g
  )
  for (const block of blocks) {
    const body = block[3]
    const first = body.match(/^\s*([A-Za-z_]\w*)/m)
    if (first) fields.add(first[1])
  }
  return fields
}

const introspect = async () => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `{
        __schema {
          queryType { fields { name } }
          mutationType { fields { name } }
          subscriptionType { fields { name } }
        }
      }`
    })
  })
  const { data } = await res.json()
  return new Set([
    ...data.__schema.queryType.fields.map((f) => f.name),
    ...(data.__schema.mutationType?.fields || []).map((f) => f.name),
    ...(data.__schema.subscriptionType?.fields || []).map((f) => f.name)
  ])
}

const run = async () => {
  const implemented = await introspect()
  const used = new Map()

  for await (const file of walk(ADMIN_GRAPHQL_DIR)) {
    const source = await readFile(file, 'utf8')
    for (const field of extractRootFields(source)) {
      if (!used.has(field)) used.set(field, [])
      used.get(field).push(file.replace(ADMIN_GRAPHQL_DIR, '').replace(/\\/g, '/'))
    }
  }

  const missing = [...used.keys()].filter((f) => !implemented.has(f)).sort()

  console.log(`Operacje używane przez panel : ${used.size}`)
  console.log(`Zaimplementowane w API        : ${used.size - missing.length}`)
  console.log(`Brakujące                     : ${missing.length}\n`)

  if (missing.length) {
    console.log('BRAKUJĄCE OPERACJE:')
    for (const field of missing) {
      console.log(`  ${field}`)
    }
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
