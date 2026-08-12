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
 * 3) In production, never fall back — and never touch the local .data/
 *    directory (the Docker image runs as a non-root `node` user, so
 *    mkdir would otherwise crash the boot with EACCES).
 */
export async function connectMongo() {
  const memoryFallbackAllowed = NODE_ENV !== 'production' && ALLOW_MEMORY_MONGO
  const dbPath = path.resolve(MONGO_MEMORY_DB_PATH)
  // Only inspect the local path when we might actually use it — creating
  // the directory on Render (read-only / non-root) was the EACCES crash.
  const hasLocalData = memoryFallbackAllowed ? dirHasData(dbPath) : false
  // Once we already have local data, don't wait long for a missing mongod.
  const externalTimeoutMs = hasLocalData ? 800 : 8000

  try {
    // Never log the full URI — it embeds credentials (mongodb+srv://user:pass@…).
    console.log('[mongo] connecting (external)')
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

    if (!memoryFallbackAllowed) {
      console.error(
        `[mongo] FATAL: cannot connect to MongoDB (${reason}).\n` +
          '  Check MONGODB_URI / Network Access in Atlas. Persistence fallback is disabled in production.'
      )
      throw err
    }

    console.warn(
      `[mongo] external unavailable (${reason}) — starting persistent local Mongo`
    )

    ensureDir(dbPath)

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
