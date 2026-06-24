import type { IncidentPhase } from "@/lib/types/incident-summary"

export interface StaffIncidentSummary {
  id: string
  facilityId: string
  /** Display name; fall back in UI to room if missing in older records. */
  residentName: string
  residentRoom: string
  incidentType: string
  hasInjury: boolean
  phase: IncidentPhase
  staffId: string
  /** Reporter display name (from incident.staffName). */
  reporterName: string
  startedAt: string
  phase1SignedAt: string | null
  completenessScore: number
  completenessAtSignoff: number
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
  /** All unanswered reporter (or IDT assignee) questions. */
  pendingQuestionCount: number
  /** Unanswered Tier 1 initial questions (reporter only). */
  pendingTier1Count: number
  /** Tier 2 follow-ups still needing a substantive answer (unanswered + deferred). */
  pendingTier2Count: number
  /** Tier 2 never touched (reporter only). */
  pendingTier2UnansweredCount: number
  /** Tier 2 explicitly deferred or marked unknown (reporter only). */
  pendingTier2DeferredCount: number
  /** Unanswered closing questions before sign-off (reporter only). */
  pendingClosingCount: number
  /** Gap analysis has produced at least one Tier 2 question on this incident. */
  tier2Generated: boolean
  isOwnReport: boolean
  hasAssignedTask: boolean
}

