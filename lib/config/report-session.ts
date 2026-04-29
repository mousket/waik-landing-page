/**
 * Unified Redis session store for the incident reporting rebuild.
 *
 * Replaces the prior `InvestigatorSession` (waik:session:*) and
 * `InterviewWorkSession` (waik:interview-work:*) keys with a single
 * `ReportSession` keyed at `waik:report:{sessionId}`. See
 * documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §1.
 */

import { getRedis } from "@/lib/redis"
import type { AgentState } from "@/lib/gold_standards"
import type { Tier1Question } from "@/lib/config/tier1-questions"

export const REPORT_SESSION_PREFIX = "waik:report:"
export const REPORT_SESSION_TTL_SEC = 7200 // 2 hours

export type ReportPhase = "tier1" | "gap_analysis" | "tier2" | "closing" | "signoff"

/**
 * AI-generated gap-fill or closing question stored in the session board. The
 * exact shape is finalized when IR-1c wires the expert investigator into the
 * answer route; the fields here cover the API contract from blueprint §2.
 */
export interface ReportBoardQuestion {
  id: string
  text: string
  label: string
  areaHint: string
  tier: "tier1" | "tier2" | "closing"
  allowDefer: boolean
  required: boolean
  /** Gold Standard fields this question targets (Tier 2 only). */
  targetFields?: string[]
}

export interface DataPointCoverageEntry {
  questionId: string
  questionText: string
  dataPointsCovered: number
  fieldsCovered: string[]
}

export interface ReportSession {
  sessionId: string
  incidentId: string
  facilityId: string
  organizationId: string
  userId: string
  userName: string
  userRole: string

  // Incident context
  incidentType: string
  residentId: string
  residentName: string
  residentRoom: string
  location: string
  hasInjury: boolean | null

  // Phase tracking
  reportPhase: ReportPhase

  // Tier 1 state
  tier1Questions: Tier1Question[]
  tier1Answers: Record<string, string>
  tier1CompletedAt: string | null

  // Accumulated narrative (grows with every answer)
  fullNarrative: string

  // Gold Standard state from expert investigator pipeline
  agentState: AgentState | null

  // Tier 2 state (AI-generated)
  tier2Questions: ReportBoardQuestion[]
  tier2Answers: Record<string, string>
  tier2DeferredIds: string[]
  tier2UnknownIds: string[]

  // Closing state (fixed)
  closingQuestions: Tier1Question[]
  closingAnswers: Record<string, string>

  // Analytics accumulated during the session
  activeDataCollectionMs: number
  dataPointsPerQuestion: DataPointCoverageEntry[]

  // Scoring
  completenessScore: number
  completenessAtTier1: number

  // Timestamps (ISO strings)
  startedAt: string
  lastActivityAt: string
}

function key(sessionId: string): string {
  return `${REPORT_SESSION_PREFIX}${sessionId}`
}

function wrapError(op: string, err: unknown): never {
  const base = err instanceof Error ? err.message : String(err)
  throw new Error(`[Redis] ${op} failed: ${base}`)
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

/**
 * Loads, mutates via `updater`, refreshes `lastActivityAt`, and writes back —
 * resetting the TTL on every successful update so an active session stays
 * alive past the 2-hour idle window.
 */
export async function updateReportSession(
  sessionId: string,
  updater: (session: ReportSession) => ReportSession,
): Promise<ReportSession> {
  const existing = await getReportSession(sessionId)
  if (!existing) {
    throw new Error(`Report session not found: ${sessionId}`)
  }
  const updated = updater(existing)
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
