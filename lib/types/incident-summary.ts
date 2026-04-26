/** Admin dashboard list API — no resident PHI beyond room. Locked in task-06a. */

export type IncidentPhase =
  | "phase_1_in_progress"
  | "phase_1_complete"
  | "phase_2_in_progress"
  | "closed"

export type Phase2SectionStatus = "not_started" | "in_progress" | "complete"

export interface IdtTeamMember {
  userId: string
  name: string
  role: string
  status: "pending" | "answered"
  questionSent: string | null
  questionSentAt: string | null
  response: string | null
  respondedAt: string | null
}

export interface IncidentSummary {
  id: string
  facilityId: string
  residentRoom: string
  incidentType: string
  hasInjury: boolean
  phase: IncidentPhase
  staffId: string
  reportedByName: string
  reportedByRole: string
  startedAt: string
  phase1SignedAt: string | null
  phase2ClaimedAt: string | null
  phase2LockedAt: string | null
  completenessAtSignoff: number
  completenessScore: number
  investigatorId: string | null
  investigatorName: string | null
  idtTeam: IdtTeamMember[]
  phase2Sections: {
    contributingFactors: { status: Phase2SectionStatus }
    rootCause: { status: Phase2SectionStatus }
    interventionReview: { status: Phase2SectionStatus }
    newIntervention: { status: Phase2SectionStatus }
  }
}
