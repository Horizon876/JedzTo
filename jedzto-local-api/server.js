import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { PORT, SEED_ON_START, ALLOWED_ORIGINS, NODE_ENV } from './src/config.js'
import { typeDefs } from './src/graphql/typeDefs.js'
import { resolvers } from './src/graphql/resolvers/index.js'
import { verifyToken } from './src/auth/jwt.js'
import {
  seedDatabase,
  CREDENTIALS,
  ensureTasteCuisineTags,
  ensureTasteCategories,
  ensureMenuItemCustomization
} from './src/seed.js'
import { Restaurant } from './src/models/index.js'
import { connectMongo, disconnectMongo } from './src/db.js'
import { UPLOADS_DIR } from './src/utils/imageUpload.js'
import { mapsRouter } from './src/routes/maps.js'
import { stripeRouter } from './src/routes/stripe.js'
import { backfillUnpublishedMenus } from './src/services/menu.js'
import { ensureItalianaDeliveryAreas } from './src/services/ensureDeliveryAreas.js'
import { ensureItalianaListing } from './src/services/ensureItalianaListing.js'
import { ensureStart10Coupon } from './src/services/ensureStart10Coupon.js'

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------
// In development (ALLOWED_ORIGINS is empty) we allow any localhost/* origin so
// that the admin panel, web client and mobile app can all connect without extra
// config.  In production set ALLOWED_ORIGINS to a comma-separated list of the
// exact origins that should be permitted (no wildcards).
const corsOrigin = (origin, callback) => {
  // Requests without an origin (e.g. server-to-server, curl, native apps).
  if (!origin) return callback(null, true)

  // Production must always run with an explicit whitelist.
  if (ALLOWED_ORIGINS.length) {
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    return callback(new Error('CORS: origin not allowed'))
  }

  if (NODE_ENV === 'production') {
    return callback(new Error('CORS: ALLOWED_ORIGINS is not configured'))
  }

  // Development: localhost, the LAN (Expo on a phone) and dev tunnels.
  const isDevOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin) ||
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^https:\/\/[\w-]+\.ngrok(-free)?\.app$/.test(origin) ||
    /^https:\/\/[\w-]+\.trycloudflare\.com$/.test(origin)

  if (isDevOrigin) return callback(null, true)
  return callback(new Error('CORS: origin not allowed'))
}

const corsOptions = { origin: corsOrigin, credentials: true }

// ---------------------------------------------------------------------------
// GraphQL context builder (shared by HTTP and WS)
// ---------------------------------------------------------------------------
const buildContext = (req) => {
  const authorization = req?.headers?.authorization || ''
  const bopAuth = req?.headers?.['bop-auth'] || ''
  const userPayload = verifyToken(authorization)
  const publicAuth = verifyToken(bopAuth)

  return {
    user:
      userPayload?.typ === 'user'
        ? {
            userId: userPayload.userId,
            role: userPayload.role,
            email: userPayload.email,
            name: userPayload.name,
            restaurantId: userPayload.restaurantId || null
          }
        : null,
    publicAuth: publicAuth?.typ === 'public' ? publicAuth : null,
    isPublicBootstrap: false,
    req
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

async function start() {
  const mongo = await connectMongo()

  if (SEED_ON_START) {
    await seedDatabase({ force: false })
  }

  await ensureTasteCategories()
  await ensureTasteCuisineTags()
  await ensureMenuItemCustomization()
  await backfillUnpublishedMenus()
  await ensureItalianaDeliveryAreas()
  await ensureItalianaListing()
  await ensureStart10Coupon()

  const app = express()

  // ---------------------------------------------------------------------------
  // Security middleware
  // ---------------------------------------------------------------------------
  // Helmet sets sensible HTTP security headers (X-Content-Type-Options, etc.).
  // Content-Security-Policy is disabled here because the /graphql endpoint is a
  // pure JSON API — CSP only matters for HTML responses.
  app.use(helmet({ contentSecurityPolicy: false }))

  // Needed for correct client IPs (and therefore correct rate limiting) when
  // running behind ngrok / a reverse proxy.
  app.set('trust proxy', 1)

  // ---------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------
  const limiter = (max, windowMs = 60 * 1000) =>
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { errors: [{ message: 'Too many requests — slow down.' }] }
    })

  const graphqlLimiter = limiter(200)
  // Geocoding proxies a billable third-party API — keep it on a short leash.
  const mapsLimiter = limiter(60)
  const paymentLimiter = limiter(30)

  // Static uploads can be served to any origin (images are public).
  // `dotfiles: deny` + no directory index keeps the folder from leaking anything
  // other than the uploaded images themselves.
  app.use(
    '/uploads',
    cors({ origin: true }),
    express.static(UPLOADS_DIR, { dotfiles: 'deny', index: false, maxAge: '1h' })
  )

  // Stripe's webhook signature is computed over the raw body, so this route
  // must keep the exact bytes — no JSON parsing before the router sees it.
  app.use('/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }))

  // Maps and Stripe redirects use the same strict CORS as the GraphQL endpoint.
  app.use('/maps', cors(corsOptions), mapsLimiter, mapsRouter)
  app.use('/stripe', paymentLimiter, stripeRouter)

  const httpServer = http.createServer(app)

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  })

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const auth =
          ctx.connectionParams?.authorization ||
          ctx.connectionParams?.Authorization ||
          ''
        const userPayload = verifyToken(auth)
        return {
          user:
            userPayload?.typ === 'user'
              ? {
                  userId: userPayload.userId,
                  role: userPayload.role,
                  email: userPayload.email,
                  name: userPayload.name,
                  restaurantId: userPayload.restaurantId || null
                }
              : null,
          publicAuth: true,
          isPublicBootstrap: false
        }
      }
    },
    wsServer
  )

  const server = new ApolloServer({
    schema,
    // Schema introspection is a reconnaissance aid — dev only.
    introspection: NODE_ENV !== 'production',
    // Never ship stack traces or driver-level messages to clients.
    formatError: (formatted, error) => {
      if (NODE_ENV !== 'production') return formatted
      const code = formatted.extensions?.code
      const isExpected = [
        'UNAUTHENTICATED',
        'FORBIDDEN',
        'BAD_USER_INPUT',
        'OTP_REQUIRED',
        'RESTAURANT_UNAVAILABLE'
      ].includes(code)
      if (isExpected) {
        return { message: formatted.message, extensions: { code } }
      }
      console.error('[graphql]', error)
      return { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            }
          }
        }
      }
    ]
  })

  await server.start()

  // Health / status endpoint. In production it reveals nothing about the
  // deployment (no counts, no internal URLs, no role list).
  app.get('/', async (_req, res) => {
    if (NODE_ENV === 'production') {
      return res.json({ name: 'JedzTo Multi-Vendor API', status: 'ok' })
    }
    const restaurants = await Restaurant.countDocuments()
    return res.json({
      name: 'JedzTo Multi-Vendor API',
      status: 'ok',
      graphql: `http://localhost:${PORT}/graphql`,
      ws: `ws://localhost:${PORT}/graphql`,
      restaurants,
      roles: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'CUSTOMER']
    })
  })

  app.get('/health', (_req, res) => res.json({ ok: true, v: 'store-pool-2' }))

  app.use(
    '/graphql',
    cors(corsOptions),
    graphqlLimiter,
    bodyParser.json({ limit: '10mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req)
    })
  )

  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve))

  console.log(`
╔══════════════════════════════════════════════════════════╗
║         JedzTo Multi-Vendor API is running               ║
╠══════════════════════════════════════════════════════════╣
║  GraphQL : http://localhost:${PORT}/graphql                 ║
║  Mongo   : ${mongo.mode}${mongo.persistent ? ' (dane na dysku)' : ''}
║  Logowanie: sprawdź .env.example — NIGDY nie commituj .env
╚══════════════════════════════════════════════════════════╝
`)

  // Render (and most PaaS) send SIGTERM before killing the container on every
  // deploy/restart. Without this, in-flight requests get dropped mid-response
  // instead of finishing cleanly.
  let shuttingDown = false
  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[server] ${signal} received, shutting down gracefully…`)
    const forceExit = setTimeout(() => process.exit(1), 10_000)
    try {
      await new Promise((resolve) => httpServer.close(resolve))
      await disconnectMongo()
      clearTimeout(forceExit)
      process.exit(0)
    } catch (err) {
      console.error('[server] error during shutdown', err)
      clearTimeout(forceExit)
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
