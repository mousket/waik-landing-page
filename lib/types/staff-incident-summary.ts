export interface StaffIncidentSummary {
  id: string
  facilityId: string
  residentRoom: string
  incidentType: string
  hasInjury: boolean
  phase: "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress" | "closed"
  staffId: string
  startedAt: string
  phase1SignedAt: string | null
  completenessScore: number
  completenessAtSignoff: number
  tier2QuestionsGenerated: number
  questionsAnswered: number
  questionsDeferred: number
}

