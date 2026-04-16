# Task 03a — Redis Session Store + Migration
## Phase: 2 — Core Hardening
## Estimated Time: 2–3 hours
## Depends On: task-01 (ClerkJS), task-02 (data isolation)

---

## Why This Task Exists

The Expert Investigator session store currently uses a JavaScript `Map`
in memory. On Vercel serverless every API call can be a different process
instance — the Map is destroyed between requests. This means a nurse who
starts an interview via `/api/agent/interview/start` and then answers via
`/api/agent/interview/answer` gets a fresh empty Map on the second call.
The session is gone. The entire conversational investigation silently fails
in production.

This task replaces the Map with Redis. Session state is written to Redis
on every update and read from Redis on every access. The session survives
across any number of serverless invocations.

Redis is already provisioned on Redis Cloud (Azure East US). This task
wires it in, establishes the key naming and TTL contract, and proves the
fix with automated tests.

---

## Environment Variables

Add to `.env.local` (values already provisioned):
```
REDIS_HOST=redis-12024.c56.east-us.azure.cloud.redislabs.com:12024
WAIK_REDIS_USER=waik_redis_dev_user
WAIK_REDIS_USER_PASSWORD=Cram9641+Wai!_Red
REDIS_WAIK_DATABASE=waik
REDIS_URL=redis://waik_redis_dev_user:Cram9641+Wai!_Red@redis-12024.c56.east-us.azure.cloud.redislabs.com:12024
```

Note: `REDIS_URL` is the combined connection string that ioredis accepts.
Construct it from the component parts above.

---

## Context Files

- `lib/agents/expert_investigator/session_store.ts` — replace this entirely
- `app/api/agent/interview/start/route.ts` — calls createSession()
- `app/api/agent/interview/answer/route.ts` — calls getSession(), updateSession()
- `app/api/agent/interview/complete/route.ts` — calls getSession(), deleteSession()

---

## Redis Contract (authoritative — all subsequent tasks must follow this)

```
Key pattern:    waik:session:{sessionId}
Serialization:  JSON.stringify / JSON.parse
TTL:            7200 seconds (2 hours) — reset on every updateSession()
Database:       waik (db index from REDIS_WAIK_DATABASE)
Failure mode:   throw descriptive Error — NEVER silently fall back to Map
Concurrency:    last-write-wins (acceptable for single-user sessions)
Date handling:  all Date objects serialized as ISO strings, parsed back on read
```

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `npm install ioredis` complete, package in dependencies
- [ ] `lib/redis.ts` singleton client exists and exports `redis`
- [ ] `lib/agents/expert_investigator/session_store.ts` uses Redis — no Map
- [ ] `createSession()` writes to Redis with 2hr TTL
- [ ] `getSession()` reads from Redis, returns null if key missing
- [ ] `updateSession()` writes updated session, resets TTL to 2hrs
- [ ] `deleteSession()` removes key from Redis
- [ ] Session survives a simulated serverless process restart (test below)
- [ ] Redis connection failure throws — does not silently continue
- [ ] TTL verified in Redis CLI: `TTL waik:session:{id}` returns ~7200
- [ ] No in-memory Map remains anywhere in the codebase

---

## Test Cases

```
TEST 1 — createSession writes to Redis
  Action: Call createSession("test-session-001", { incidentId: "inc-001" })
  Action: In Redis CLI: GET waik:session:test-session-001
  Expected: JSON string containing incidentId: "inc-001"
  Pass/Fail: ___

TEST 2 — TTL set correctly
  Action: After createSession, run: TTL waik:session:test-session-001
  Expected: Value between 7195 and 7200
  Pass/Fail: ___

TEST 3 — getSession returns correct data
  Action: createSession("test-002", { phase: "tier1", answers: [] })
          const session = await getSession("test-002")
  Expected: session.phase === "tier1", session.answers deep equals []
  Pass/Fail: ___

TEST 4 — getSession returns null for missing key
  Action: await getSession("nonexistent-session-xyz")
  Expected: null returned, no error thrown
  Pass/Fail: ___

TEST 5 — updateSession resets TTL
  Action: createSession, wait 5 seconds, updateSession with new data
          TTL waik:session:{id} after updateSession
  Expected: TTL reset to ~7200, not ~7195
  Pass/Fail: ___

TEST 6 — deleteSession removes key
  Action: createSession("test-003", {}), deleteSession("test-003")
          GET waik:session:test-003
  Expected: nil (key does not exist)
  Pass/Fail: ___

TEST 7 — Cross-process session survival
  Action: createSession("test-004", { step: "start" })
          Simulate new process: import session_store fresh (or mock require cache clear)
          getSession("test-004")
  Expected: session data intact — { step: "start" }
  Pass/Fail: ___

TEST 8 — Date fields round-trip correctly
  Action: createSession("test-005", { startedAt: new Date("2026-04-15T10:00:00Z") })
          const s = await getSession("test-005")
  Expected: s.startedAt is either a Date object or ISO string "2026-04-15T10:00:00.000Z"
            (not NaN, not undefined)
  Pass/Fail: ___

TEST 9 — Redis failure throws
  Action: Temporarily set REDIS_URL to an invalid value
          Call createSession()
  Expected: Error thrown with message containing "Redis" or "connection"
            No silent fallback, no undefined behavior
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. The Expert Investigator session store
currently uses an in-memory Map which fails on Vercel serverless because
each API call can be a different process. I need to replace it with Redis.

Redis is already provisioned on Redis Cloud. Connection details:
  REDIS_URL=redis://waik_redis_dev_user:Cram9641+Wai!_Red@redis-12024.c56.east-us.azure.cloud.redislabs.com:12024

STEP 1 — Install ioredis:
  npm install ioredis
  npm install --save-dev @types/ioredis (if needed — ioredis v5+ includes types)

STEP 2 — Create lib/redis.ts (singleton client):

import Redis from "ioredis"

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set")
}

// Singleton pattern — reuse connection across serverless warm invocations
const globalForRedis = global as unknown as { redis?: Redis }

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
})

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message)
})

export default redis

STEP 3 — Replace lib/agents/expert_investigator/session_store.ts entirely:

CONTRACT:
  Key:  waik:session:{sessionId}
  TTL:  7200 seconds (2 hours), reset on every write
  DB:   The Redis URL already points to the correct database
  Fail: throw Error on Redis failure — never silently fall back

import { redis } from "@/lib/redis"

const SESSION_PREFIX = "waik:session:"
const SESSION_TTL = 7200  // 2 hours in seconds

type SessionId = string

// InvestigatorSession type — keep whatever type currently exists in the file
// Import it or redefine it here

export async function createSession(
  sessionId: SessionId,
  data: InvestigatorSession
): Promise<void> {
  const key = SESSION_PREFIX + sessionId
  const serialized = JSON.stringify(data)
  await redis.set(key, serialized, "EX", SESSION_TTL)
}

export async function getSession(
  sessionId: SessionId
): Promise<InvestigatorSession | null> {
  const key = SESSION_PREFIX + sessionId
  const raw = await redis.get(key)
  if (!raw) return null
  return JSON.parse(raw) as InvestigatorSession
}

export async function updateSession(
  sessionId: SessionId,
  data: Partial<InvestigatorSession>
): Promise<void> {
  const key = SESSION_PREFIX + sessionId
  const existing = await getSession(sessionId)
  if (!existing) {
    throw new Error(`[Redis] Cannot update session ${sessionId} — not found`)
  }
  const updated = { ...existing, ...data }
  await redis.set(key, JSON.stringify(updated), "EX", SESSION_TTL)
}

export async function deleteSession(
  sessionId: SessionId
): Promise<void> {
  const key = SESSION_PREFIX + sessionId
  await redis.del(key)
}

STEP 4 — Verify no in-memory Map remains:
  Search entire codebase for "new Map" in session-related files
  Remove any remaining Map-based session storage
  If any other file imports from session_store: verify it still works
  with the new async API (all functions are now async — callers must await)

STEP 5 — Add to .env.local:
  REDIS_URL=redis://waik_redis_dev_user:Cram9641+Wai!_Red@redis-12024.c56.east-us.azure.cloud.redislabs.com:12024

STEP 6 — Add to .env.example (without real credentials):
  REDIS_URL=redis://username:password@host:port

Run npm run build. Fix all TypeScript errors.
Do not touch any route handlers yet — that is the next task.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — Redis session store section
- Create `plan/pilot_1/phase_2/task-03a-DONE.md`
