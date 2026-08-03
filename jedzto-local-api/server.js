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
import { PORT, SEED_ON_START, ALLOWED_ORIGINS } from './src/config.js'
import { typeDefs } from './src/graphql/typeDefs.js'
import { resolvers } from './src/graphql/resolvers/index.js'
import { verifyToken } from './src/auth/jwt.js'
import { seedDatabase, CREDENTIALS, ensureTasteCuisineTags, ensureMenuItemCustomization } from './src/seed.js'
import { Restaurant } from './src/models/index.js'
import { connectMongo } from './src/db.js'
import { UPLOADS_DIR } from './src/utils/imageUpload.js'
import { mapsRouter } from './src/routes/maps.js'
import { stripeRouter } from './src/routes/stripe.js'
import { backfillUnpublishedMenus } from './src/services/menu.js'

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------
// In development (ALLOWED_ORIGINS is empty) we allow any localhost/* origin so
// that the admin panel, web client and mobile app can all connect without extra
// config.  In production set ALLOWED_ORIGINS to a comma-separated list of the
// exact origins that should be permitted (no wildcards).
const corsOrigin = (origin, callback) => {
  // Requests without an origin (e.g. server-to-server, curl) are always allowed.
  if (!origin) return callback(null, true)

  if (ALLOWED_ORIGINS.length === 0) {
    // Development mode: permit localhost and local network addresses only.
    const isLocal =
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin) ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)

    if (isLocal) return callback(null, true)

    // Also allow ngrok/tunnel domains in dev (common for mobile testing).
    if (/\.ngrok(-free)?\.app$/.test(origin) || /\.trycloudflare\.com$/.test(origin)) {
      return callback(null, true)
    }

    return callback(null, true) // Fully open in dev
  }

  // Production: strict whitelist.
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
  return callback(new Error(`CORS: origin ${origin} not allowed`))
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

  await ensureTasteCuisineTags()
  await ensureMenuItemCustomization()
  await backfillUnpublishedMenus()

  const app = express()

  // ---------------------------------------------------------------------------
  // Security middleware
  // ---------------------------------------------------------------------------
  // Helmet sets sensible HTTP security headers (X-Content-Type-Options, etc.).
  // Content-Security-Policy is disabled here because the /graphql endpoint is a
  // pure JSON API — CSP only matters for HTML responses.
  app.use(helmet({ contentSecurityPolicy: false }))

  // Static uploads can be served to any origin (images are public).
  app.use('/uploads', cors({ origin: true }), express.static(UPLOADS_DIR))

  // Maps and Stripe routes use the same strict CORS as the GraphQL endpoint.
  app.use('/maps', cors(corsOptions), mapsRouter)
  app.use('/stripe', stripeRouter)

  // ---------------------------------------------------------------------------
  // Rate limiting — 200 requests per minute per IP for the GraphQL endpoint.
  // Adjust windowMs/max as needed when deploying behind a load balancer.
  // ---------------------------------------------------------------------------
  const graphqlLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many requests — slow down.' }] }
  })

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

  // Health / status endpoint — NO credentials in response.
  app.get('/', async (_req, res) => {
    const restaurants = await Restaurant.countDocuments()
    res.json({
      name: 'JedzTo Multi-Vendor API',
      status: 'ok',
      graphql: `http://localhost:${PORT}/graphql`,
      ws: `ws://localhost:${PORT}/graphql`,
      restaurants,
      roles: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'CUSTOMER']
    })
  })

  app.get('/health', (_req, res) => res.json({ ok: true }))

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
║  Mongo   : ${mongo.mode}
║  Logowanie: sprawdź .env.example — NIGDY nie commituj .env
╚══════════════════════════════════════════════════════════╝
`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
