import { getRedis } from "@/lib/redis"
import type { ActivityAssessmentStandards, DietaryAssessmentStandards } from "@/lib/assessment_standards"

export type AssessmentConversationTurn = {
  questionId: string
  questionText: string
  answerText: string
  at: number
}

export interface AssessmentAgentSession {
  id: string
  assessmentId: string
  facilityId: string
  organizationId?: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: "activity" | "dietary"
  conductedById: string
  conductedByName: string
  /** Question currently shown to the user (must match the next /api/agent/assessment answer). */
  activeQuestion: { id: string; text: string } | null
  /** Partial structured fields accumulated so far */
  structured: Partial<ActivityAssessmentStandards> & Partial<DietaryAssessmentStandards>
  conversation: AssessmentConversationTurn[]
  askedQuestionIds: string[]
  createdAt: number
  updatedAt: number
}

const PREFIX = "waik:assessment-session:"
const TTL_SEC = 7200

function key(sessionId: string): string {
  return `${PREFIX}${sessionId}`
}

function wrapError(op: string, err: unknown): never {
  const base = err instanceof Error ? err.message : String(err)
  throw new Error(`[Redis] ${op} failed: ${base}`)
}

export async function createAssessmentSession(session: AssessmentAgentSession): Promise<void> {
  const payload = JSON.stringify(session)
  try {
    await getRedis().set(key(session.id), payload, "EX", TTL_SEC)
  } catch (e) {
    wrapError("SET (createAssessmentSession)", e)
  }
}

export async function getAssessmentSession(
  sessionId: string,
): Promise<AssessmentAgentSession | undefined> {
  try {
    const raw = await getRedis().get(key(sessionId))
    if (raw == null) return undefined
    return JSON.parse(raw) as AssessmentAgentSession
  } catch (e) {
    wrapError("GET (getAssessmentSession)", e)
  }
}

export async function updateAssessmentSession(
  sessionId: string,
  updater: (s: AssessmentAgentSession) => AssessmentAgentSession,
): Promise<void> {
  const existing = await getAssessmentSession(sessionId)
  if (!existing) {
    return
  }
  const updated = updater(existing)
  updated.updatedAt = Date.now()
  try {
    await getRedis().set(key(sessionId), JSON.stringify(updated), "EX", TTL_SEC)
  } catch (e) {
    wrapError("SET (updateAssessmentSession)", e)
  }
}

export async function deleteAssessmentSession(sessionId: string): Promise<void> {
  try {
    await getRedis().del(key(sessionId))
  } catch (e) {
    wrapError("DEL (deleteAssessmentSession)", e)
  }
}
