/**
 * Pre-flight: verify MongoDB and/or one or two Redis credential pairs (no secrets printed).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/verify-redis-mongo-connections.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/verify-redis-mongo-connections.ts --redis-only
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import Redis from "ioredis"
import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"

const redisOnly = process.argv.includes("--redis-only")

function parseRedisHostPort(raw: string): { host: string; port: number } {
  const parts = raw.trim().split(":")
  const port = parts.length > 1 ? Number(parts[parts.length - 1]) : 6379
  const host = parts.length > 1 ? parts.slice(0, -1).join(":") : parts[0]
  return { host, port: Number.isFinite(port) ? port : 6379 }
}

/** ioredis uses numeric DB 0..N; `REDIS_WAIK_DATABASE=waik` is a console label unless REDIS_DB is set. */
function redisDbIndex(): number {
  if (process.env.REDIS_DB != null && process.env.REDIS_DB !== "") {
    const n = Number(process.env.REDIS_DB)
    if (Number.isFinite(n)) return n
  }
  const w = process.env.REDIS_WAIK_DATABASE
  if (w != null && /^\d+$/.test(String(w))) {
    return Number(w)
  }
  return 0
}

function useTls(): boolean {
  return process.env.REDIS_USE_TLS === "1" || process.env.REDIS_URL?.startsWith("rediss://") === true
}

async function testRedisPair(
  _label: string,
  username: string,
  password: string,
  hostPort: { host: string; port: number },
  db: number,
): Promise<void> {
  const { host, port } = hostPort
  const client = new Redis({
    host,
    port,
    username: username || undefined,
    password: password || undefined,
    db,
    maxRetriesPerRequest: 2,
    connectTimeout: 15_000,
    ...(useTls() ? { tls: { servername: host } } : {}),
  })

  try {
    const pong = await client.ping()
    if (pong !== "PONG") {
      throw new Error(`Unexpected PING reply: ${pong}`)
    }
    const testKey = `waik:connectivity-test:${Date.now()}`
    await client.set(testKey, "1", "EX", 10)
    const v = await client.get(testKey)
    await client.del(testKey)
    if (v !== "1") {
      throw new Error("Redis SET/GET test failed")
    }
  } finally {
    client.disconnect()
  }
}

async function testMongo(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env / .env.local")
  }
  await connectMongo()
  const name = mongoose.connection.name
  await mongoose.connection.db?.admin().ping()
  await mongoose.disconnect()
  console.log(`MONGO_OK (dbName=${name})`)
}

/** REDIS_URL wins if set — single pair only. */
async function testAllRedisFromEnv(): Promise<void> {
  const url = process.env.REDIS_URL
  if (url) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 15_000,
    })
    try {
      if ((await client.ping()) !== "PONG") throw new Error("PING failed")
      console.log("REDIS_URL_REDIS_OK (PING; using REDIS_URL only)")
    } finally {
      client.disconnect()
    }
    return
  }

  const hostRaw = process.env.REDIS_HOST
  if (!hostRaw) {
    throw new Error("Set REDIS_HOST (or REDIS_URL)")
  }
  const hostPort = parseRedisHostPort(hostRaw)
  const db = redisDbIndex()
  if (
    process.env.REDIS_WAIK_DATABASE &&
    !/^\d+$/.test(String(process.env.REDIS_WAIK_DATABASE)) &&
    process.env.REDIS_DB == null
  ) {
    console.log(
      `Note: REDIS_WAIK_DATABASE=${process.env.REDIS_WAIK_DATABASE} is not a numeric index; using dbIndex=${db} (set REDIS_DB if you need another logical DB)`,
    )
  }

  const aUser = process.env.WAIK_REDIS_USER
  const aPass = process.env.WAIK_REDIS_USER_PASSWORD
  const bUser = process.env.REDIS_USER
  const bPass = process.env.REDIS_PASSWORD

  if (!aUser && !aPass && !bUser && !bPass) {
    throw new Error("No Redis credentials: set WAIK_REDIS_* and/or REDIS_USER+REDIS_PASSWORD or REDIS_URL")
  }

  const results: { label: string; ok: boolean; err?: string }[] = []
  if (aUser && aPass) {
    try {
      await testRedisPair("WAIK_REDIS", aUser, aPass, hostPort, db)
      results.push({ label: "WAIK_REDIS_USER (waik_redis_dev_user / …)", ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ label: "WAIK_REDIS_USER", ok: false, err: msg })
    }
  } else {
    console.log("Skip: WAIK_REDIS_USER or WAIK_REDIS_USER_PASSWORD not set")
  }

  if (bUser && bPass) {
    try {
      await testRedisPair("REDIS_USER", bUser, bPass, hostPort, db)
      results.push({ label: "REDIS_USER (default / …)", ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ label: "REDIS_USER+REDIS_PASSWORD", ok: false, err: msg })
    }
  } else {
    console.log("Skip: REDIS_USER or REDIS_PASSWORD not set")
  }

  for (const r of results) {
    if (r.ok) {
      console.log(`RESULT ${r.label}: OK`)
    } else {
      console.log(`RESULT ${r.label}: FAIL — ${r.err ?? "unknown"}`)
    }
  }
  const allOk = results.length > 0 && results.every((r) => r.ok)
  const anyOk = results.some((r) => r.ok)
  if (results.length === 0) {
    throw new Error("No Redis credential pairs were run")
  }
  if (!anyOk) {
    throw new Error("All configured Redis user pairs failed (see RESULT lines above)")
  }
  if (!allOk) {
    console.log("WARNING: at least one Redis user failed; at least one succeeded (see RESULT lines).")
  }
}

async function main() {
  if (!redisOnly) {
    await testMongo()
  }
  await testAllRedisFromEnv()
  console.log(redisOnly ? "REDIS_CHECKS_OK" : "ALL_CONNECTIONS_OK")
}

main().catch((e) => {
  console.error("CONNECTION_CHECK_FAILED:", e instanceof Error ? e.message : e)
  process.exit(1)
})
