import Redis from "ioredis"

/**
 * Lazy singleton — connects on first `getRedis()` (API runtime), not at module import,
 * so `next build` does not require Redis env in every environment.
 */
const globalForRedis = globalThis as unknown as { __waikRedis?: Redis }

function parseHostPort(raw: string): { host: string; port: number } {
  const t = raw.trim()
  const parts = t.split(":")
  if (parts.length < 2) {
    return { host: t, port: 6379 }
  }
  const p = Number(parts[parts.length - 1])
  const host = parts.slice(0, -1).join(":")
  return { host, port: Number.isFinite(p) ? p : 6379 }
}

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

function redisConnectionUsesTls(): boolean {
  return process.env.REDIS_USE_TLS === "1" || (process.env.REDIS_URL?.startsWith("rediss://") ?? false)
}

function createClient(): Redis {
  const url = process.env.REDIS_URL
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 15_000,
      enableReadyCheck: true,
      lazyConnect: false,
    })
  }

  const hostRaw = process.env.REDIS_HOST
  const user = process.env.WAIK_REDIS_USER
  const pass = process.env.WAIK_REDIS_USER_PASSWORD
  if (!hostRaw || !user || pass == null || pass === "") {
    throw new Error(
      "[Redis] Set REDIS_URL, or set REDIS_HOST + WAIK_REDIS_USER + WAIK_REDIS_USER_PASSWORD",
    )
  }

  const { host, port } = parseHostPort(hostRaw)
  const db = redisDbIndex()
  return new Redis({
    host,
    port,
    username: user,
    password: pass,
    db,
    maxRetriesPerRequest: 3,
    connectTimeout: 15_000,
    enableReadyCheck: true,
    lazyConnect: false,
    ...(redisConnectionUsesTls() ? { tls: { servername: host } } : {}),
  })
}

export function getRedis(): Redis {
  if (globalForRedis.__waikRedis) {
    return globalForRedis.__waikRedis
  }
  try {
    const r = createClient()
    r.on("error", (err) => {
      console.error("[Redis]", err.message)
    })
    globalForRedis.__waikRedis = r
    return r
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`[Redis] connection setup failed: ${msg}`)
  }
}

export default getRedis
