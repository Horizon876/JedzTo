import mongoose from 'mongoose'
import { MONGODB_URI } from './config.js'

let memoryServer = null

export async function connectMongo() {
  try {
    console.log(`[mongo] connecting ${MONGODB_URI}`)
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 })
    console.log('[mongo] connected (external)')
    return { mode: 'external', uri: MONGODB_URI }
  } catch (err) {
    console.warn(`[mongo] external unavailable (${err.message}) — starting memory server`)
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'jedzto' }
    })
    const uri = memoryServer.getUri('jedzto')
    await mongoose.connect(uri)
    console.log(`[mongo] connected (memory) ${uri}`)
    return { mode: 'memory', uri }
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect()
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
}
