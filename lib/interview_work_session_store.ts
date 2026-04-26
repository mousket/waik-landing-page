import { getRedis } from "@/lib/redis"

/**
 * Server-side state for the legacy /api/agent/interview/* flow (e.g. beta create).
 * Distinct from InvestigatorSession in session_store (expert graph / report-conversational).
 */
export interface InterviewWorkQuestion {
  id: string
  text: string
  phase: "initial" | "follow-up" | "final-critical"
  goldStandardField?: string
  isCritical: boolean
}

export interface InterviewWorkAnswer {
  questionId: string
  questionText?: string
  text: string
  answeredAt: string
  method?: "voice" | "text"
}

export interface InterviewWorkSession {
  id: string
  userId: string
  facilityId: string
  residentName?: string
  roomNumber?: string
  narrative: string
  reportedById: string
  reportedByName?: string
  category: string
  subtype: string | null
  completenessScore: number
  questions: InterviewWorkQuestion[]
  answers: InterviewWorkAnswer[]
  createdAt: string
  updatedAt: string
}

const PREFIX = "waik:interview-work:"
const TTL_SEC = 7200

function key(id: string): string {
  return `${PREFIX}${id}`
}

function wrapError(op: string, err: unknown): never {
  const base = err instanceof Error ? err.message : String(err)
  throw new Error(`[Redis] ${op} failed: ${base}`)
}

export async function createInterviewWorkSession(session: InterviewWorkSession): Promise<void> {
  const payload = JSON.stringify(session)
  try {
    await getRedis().set(key(session.id), payload, "EX", TTL_SEC)
  } catch (e) {
    wrapError("SET (createInterviewWorkSession)", e)
  }
}

export async function getInterviewWorkSession(
  sessionId: string,
): Promise<InterviewWorkSession | undefined> {
  try {
    const raw = await getRedis().get(key(sessionId))
    if (raw == null) return undefined
    return JSON.parse(raw) as InterviewWorkSession
  } catch (e) {
    wrapError("GET (getInterviewWorkSession)", e)
  }
}

export async function updateInterviewWorkSession(
  sessionId: string,
  updater: (session: InterviewWorkSession) => InterviewWorkSession,
): Promise<void> {
  const existing = await getInterviewWorkSession(sessionId)
  if (!existing) {
    return
  }
  const updated = updater(existing)
  updated.updatedAt = new Date().toISOString()
  try {
    await getRedis().set(key(sessionId), JSON.stringify(updated), "EX", TTL_SEC)
  } catch (e) {
    wrapError("SET (updateInterviewWorkSession)", e)
  }
}

export async function deleteInterviewWorkSession(sessionId: string): Promise<void> {
  try {
    await getRedis().del(key(sessionId))
  } catch (e) {
    wrapError("DEL (deleteInterviewWorkSession)", e)
  }
}
