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
  startedAt: string
  phase1SignedAt: string | null
  completenessScore: number
  completenessAtSignoff: number
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
}

