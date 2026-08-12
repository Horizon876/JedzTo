import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import {
  MONGODB_URI,
  ALLOW_MEMORY_MONGO,
  MONGO_MEMORY_DB_PATH,
  NODE_ENV
} from './config.js'

let memoryServer = null

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function dirHasData(dir) {
  try {
    if (!fs.existsSync(dir)) return false
    return fs.readdirSync(dir).length > 0
  } catch {
    return false
  }
}

async function connectExternal(uri, timeoutMs) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: timeoutMs })
}

/**
 * Connect to MongoDB.
 *
 * 1) Prefer external MONGODB_URI (real mongod / Atlas).
 * 2) In development, if unavailable and ALLOW_MEMORY_MONGO, start
 *    mongodb-memory-server with a **persistent on-disk dbPath** so
 *    restaurants/orders survive API restarts.
 * 3) In production, never fall back — exit with a clear error.
 */
export async function connectMongo() {
  const dbPath = ensureDir(path.resolve(MONGO_MEMORY_DB_PATH))
  const hasLocalData = dirHasData(dbPath)
  // Once we already have local data, don't wait long for a missing mongod.
  const externalTimeoutMs = hasLocalData ? 800 : 2500

  try {
    console.log(`[mongo] connecting ${MONGODB_URI}`)
    await connectExternal(MONGODB_URI, externalTimeoutMs)
    console.log('[mongo] connected (external)')
    return { mode: 'external', uri: MONGODB_URI, persistent: true }
  } catch (err) {
    const reason = err?.message || String(err)

    // Clear failed connection state before retrying with another server.
    try {
      await mongoose.disconnect()
    } catch {
      /* ignore */
    }

    if (NODE_ENV === 'production' || !ALLOW_MEMORY_MONGO) {
      console.error(
        `[mongo] FATAL: cannot connect to ${MONGODB_URI} (${reason}).\n` +
          '  Start MongoDB or set MONGODB_URI. Persistence fallback is disabled.'
      )
      throw err
    }

    console.warn(
      `[mongo] external unavailable (${reason}) — starting persistent local Mongo`
    )

    const { MongoMemoryServer } = await import('mongodb-memory-server')

    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'jedzto',
        dbPath,
        storageEngine: 'wiredTiger',
        // Fixed port so tools can also use mongodb://127.0.0.1:27017/jedzto
        port: 27017
      }
    })

    const uri = memoryServer.getUri('jedzto')
    await mongoose.connect(uri)
    console.log(`[mongo] connected (persistent-local) dbPath=${dbPath}`)
    console.log(
      '[mongo] Dane (restauracje, zamówienia) są zapisywane na dysku i przeżywają restart API.'
    )
    return { mode: 'persistent-local', uri, persistent: true, dbPath }
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect()
  if (memoryServer) {
    // Keep on-disk data (unlike default cleanup).
    await memoryServer.stop({ doCleanup: false, force: false })
    memoryServer = null
  }
}
