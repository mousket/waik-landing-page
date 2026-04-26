import type { AgentState } from "@/lib/gold_standards"
import { getRedis } from "@/lib/redis"
import type { MissingFieldDescriptor } from "./gap_questions"

export interface InvestigatorSession {
  id: string
  incidentId: string
  facilityId: string
  investigatorId: string
  investigatorName: string
  nurseName: string
  state: AgentState
  score: number
  completenessScore: number
  feedback: string
  baseScore: number
  baseCompletenessScore: number
  baseFeedback: string
  baseStrengths: string[]
  baseGaps: string[]
  pendingQuestions: PendingQuestion[]
  missingFields: MissingFieldDescriptor[]
  askedQuestionIds: string[]
  askedQuestions: string[]
  answersGiven: number
  createdAt: number
  updatedAt: number
}

export interface PendingQuestion {
  id: string
  text: string
  askedBy?: string
  assignedTo?: string[]
  askedAt?: string
}

const SESSION_PREFIX = "waik:session:"
const SESSION_TTL_SEC = 7200

function key(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`
}

function wrapError(op: string, err: unknown): never {
  const base = err instanceof Error ? err.message : String(err)
  throw new Error(`[Redis] ${op} failed: ${base}`)
}

export async function createSession(session: InvestigatorSession): Promise<void> {
  const payload = JSON.stringify(session)
  try {
    await getRedis().set(key(session.id), payload, "EX", SESSION_TTL_SEC)
  } catch (e) {
    wrapError("SET (createSession)", e)
  }
}

export async function getSession(sessionId: string): Promise<InvestigatorSession | undefined> {
  try {
    const raw = await getRedis().get(key(sessionId))
    if (raw == null) return undefined
    return JSON.parse(raw) as InvestigatorSession
  } catch (e) {
    wrapError("GET (getSession)", e)
  }
}

export async function updateSession(
  sessionId: string,
  updater: (session: InvestigatorSession) => InvestigatorSession,
): Promise<void> {
  const existing = await getSession(sessionId)
  if (!existing) {
    return
  }
  const updated = updater(existing)
  updated.updatedAt = Date.now()
  try {
    await getRedis().set(key(sessionId), JSON.stringify(updated), "EX", SESSION_TTL_SEC)
  } catch (e) {
    wrapError("SET (updateSession)", e)
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await getRedis().del(key(sessionId))
  } catch (e) {
    wrapError("DEL (deleteSession)", e)
  }
}

/** Lists all investigator sessions (SCAN — use sparingly; mainly for debugging). */
export async function listSessions(): Promise<InvestigatorSession[]> {
  const r = getRedis()
  const out: InvestigatorSession[] = []
  let cursor = "0"
  try {
    do {
      const [next, keys] = await r.scan(cursor, "MATCH", `${SESSION_PREFIX}*`, "COUNT", 200)
      cursor = next
      for (const k of keys) {
        const raw = await r.get(k)
        if (raw) {
          out.push(JSON.parse(raw) as InvestigatorSession)
        }
      }
    } while (cursor !== "0")
    return out
  } catch (e) {
    wrapError("SCAN/GET (listSessions)", e)
  }
}
