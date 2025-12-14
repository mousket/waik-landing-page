import mongoose from "mongoose"

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined
}

const globalCache: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null }

export async function connectMongo(): Promise<typeof mongoose> {
  const databaseUrl = process.env.DATABASE_URL
  const databaseName = process.env.MONGODB_DB_NAME || "waik-demo"

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined")
  }

  if (globalCache.conn) {
    return globalCache.conn
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(databaseUrl, {
      dbName: databaseName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30_000,
    })
  }

  try {
    globalCache.conn = await globalCache.promise
  } catch (error) {
    globalCache.promise = null
    throw error
  }

  global.__mongooseCache = globalCache
  return globalCache.conn
}

export default connectMongo

