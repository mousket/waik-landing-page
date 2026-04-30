import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import type { AgentState } from "@/lib/gold_standards"
import { getRedis } from "@/lib/redis"
import type { Tier1Question } from "@/lib/config/tier1-questions"

export const REPORT_SESSION_PREFIX = "waik:report:"
export const REPORT_SESSION_TTL_SEC = 7200

export type ReportPhase = "tier1" | "gap_analysis" | "tier2" | "closing" | "signoff"

export interface ReportSession {
  sessionId: string
  incidentId: string
  facilityId: string
  userId: string
  userName: string
  userRole: string

  incidentType: string
  residentId: string
  residentName: string
  residentRoom: string
  location: string
  hasInjury: boolean | null

  reportPhase: ReportPhase

  tier1Questions: Tier1Question[]
  tier1Answers: Record<string, string>
  tier1CompletedAt: string | null

  fullNarrative: string

  agentState: AgentState | null

  tier2Questions: PendingQuestion[]
  tier2Answers: Record<string, string>
  tier2DeferredIds: string[]
  tier2UnknownIds: string[]

  closingQuestions: Tier1Question[]
  closingAnswers: Record<string, string>

  activeDataCollectionMs: number
  dataPointsPerQuestion: Array<{
    questionId: string
    questionText: string
    dataPointsCovered: number
    fieldsCovered: string[]
  }>

  completenessScore: number
  completenessAtTier1: number

  /** Set after Tier 1 gap analysis; mirrors Mongo `tier2QuestionsGenerated` when synced later. */
  tier2QuestionsGenerated: number

  startedAt: string
  lastActivityAt: string
}

function key(sessionId: string): string {
  return `${REPORT_SESSION_PREFIX}${sessionId}`
}

function wrapError(op: string, err: unknown): never {
  const base = err instanceof Error ? err.message : String(err)
  throw new Error(`[Redis report session] ${op} failed: ${base}`)
}

export async function createReportSession(session: ReportSession): Promise<void> {
  try {
    await getRedis().set(key(session.sessionId), JSON.stringify(session), "EX", REPORT_SESSION_TTL_SEC)
  } catch (e) {
    wrapError("SET (createReportSession)", e)
  }
}

export async function getReportSession(sessionId: string): Promise<ReportSession | null> {
  try {
    const raw = await getRedis().get(key(sessionId))
    if (raw == null) return null
    return JSON.parse(raw) as ReportSession
  } catch (e) {
    wrapError("GET (getReportSession)", e)
  }
}

export async function updateReportSession(
  sessionId: string,
  updater: (s: ReportSession) => ReportSession,
): Promise<ReportSession> {
  const session = await getReportSession(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  const updated = updater(session)
  updated.lastActivityAt = new Date().toISOString()
  try {
    await getRedis().set(key(sessionId), JSON.stringify(updated), "EX", REPORT_SESSION_TTL_SEC)
  } catch (e) {
    wrapError("SET (updateReportSession)", e)
  }
  return updated
}

export async function deleteReportSession(sessionId: string): Promise<void> {
  try {
    await getRedis().del(key(sessionId))
  } catch (e) {
    wrapError("DEL (deleteReportSession)", e)
  }
}
