import { getIncidentById, updateIncident } from "@/lib/db"
import type { AgentState } from "@/lib/gold_standards"

interface FinalizeInvestigationInput {
  incidentId: string
  facilityId: string
  state: AgentState
  investigatorId?: string
  investigatorName?: string
  score: number
  completenessScore?: number
  feedback: string
}

export async function finalizeInvestigation(input: FinalizeInvestigationInput) {
  const incident = await getIncidentById(input.incidentId, input.facilityId)
  if (!incident) {
    throw new Error(`Incident ${input.incidentId} not found when finalizing investigation`)
  }

  const existingInvestigation = incident.investigation ?? {
    status: "not-started" as const,
  }

  const now = new Date().toISOString()

  await updateIncident(input.incidentId, input.facilityId, {
    investigation: {
      ...existingInvestigation,
      status: "completed",
      completedAt: now,
      investigatorId: input.investigatorId ?? existingInvestigation.investigatorId,
      investigatorName: input.investigatorName ?? existingInvestigation.investigatorName,
      subtype: input.state.sub_type ?? existingInvestigation.subtype,
      goldStandard: input.state.global_standards,
      subTypeData: input.state.sub_type_data ?? null,
      score: input.score,
      feedback: input.feedback,
      completenessScore: input.completenessScore ?? existingInvestigation.completenessScore,
    },
  })
}

