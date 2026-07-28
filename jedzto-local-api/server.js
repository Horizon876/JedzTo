import http from 'http'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { PORT, SEED_ON_START } from './src/config.js'
import { typeDefs } from './src/graphql/typeDefs.js'
import { resolvers } from './src/graphql/resolvers.js'
import { verifyToken } from './src/auth/jwt.js'
import { seedDatabase, CREDENTIALS } from './src/seed.js'
import { Restaurant } from './src/models/index.js'
import { connectMongo } from './src/db.js'
import { UPLOADS_DIR } from './src/utils/imageUpload.js'
import { mapsRouter } from './src/routes/maps.js'
import { backfillUnpublishedMenus } from './src/services/menu.js'

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

  await backfillUnpublishedMenus()

  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use('/uploads', express.static(UPLOADS_DIR))
  app.use('/maps', mapsRouter)

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

  app.get('/', async (_req, res) => {
    const restaurants = await Restaurant.countDocuments()
    res.json({
      name: 'JedzTo Multi-Vendor API',
      status: 'ok',
      graphql: `http://localhost:${PORT}/graphql`,
      ws: `ws://localhost:${PORT}/graphql`,
      restaurants,
      roles: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'CUSTOMER'],
      admin: {
        email: CREDENTIALS.admin.email,
        password: CREDENTIALS.admin.password
      },
      owners: [
        { email: CREDENTIALS.owner1.email, password: CREDENTIALS.owner1.password },
        { email: CREDENTIALS.owner2.email, password: CREDENTIALS.owner2.password }
      ],
      customer: {
        email: CREDENTIALS.customer.email,
        password: CREDENTIALS.customer.password
      },
      otp: '123456'
    })
  })

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use(
    '/graphql',
    cors({ origin: true, credentials: true }),
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
║  Admin   : ${CREDENTIALS.admin.email} / ${CREDENTIALS.admin.password}
║  Owner1  : ${CREDENTIALS.owner1.email} / ${CREDENTIALS.owner1.password}
║  Owner2  : ${CREDENTIALS.owner2.email} / ${CREDENTIALS.owner2.password}
║  Customer: ${CREDENTIALS.customer.email} / ${CREDENTIALS.customer.password}
╚══════════════════════════════════════════════════════════╝
`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
