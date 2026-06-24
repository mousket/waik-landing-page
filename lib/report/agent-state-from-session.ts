import { computeCompleteness, sanitizeGlobalStandards } from "@/lib/agents/expert_investigator/analyze"
import { normalizeExtractionFromNarrative } from "@/lib/agents/expert_investigator/extraction-normalizer"
import type { AgentState } from "@/lib/gold_standards"
import type { ReportSession } from "@/lib/config/report-session"

export function seedAgentStateFromReport(session: ReportSession): AgentState {
  return {
    global_standards: sanitizeGlobalStandards({
      resident_name: session.residentName,
      room_number: session.residentRoom,
      location_of_fall: session.location,
      staff_narrative: session.fullNarrative?.trim() ?? "",
    }),
    sub_type: null,
    sub_type_data: null,
  }
}

/** Rebuild gap-analysis state from narrative when Redis session was lost or never had agentState. */
export function rebuildAgentStateFromSession(session: ReportSession): AgentState | null {
  if (session.agentState) return session.agentState

  const narrative = session.fullNarrative?.trim() ?? ""
  if (!narrative) return null

  let state = seedAgentStateFromReport(session)
  state = normalizeExtractionFromNarrative(narrative, state)
  const tracked = computeCompleteness({
    ...state,
    global_standards: {
      ...state.global_standards,
      staff_narrative: narrative,
    },
  })

  return {
    ...state,
    global_standards: {
      ...state.global_standards,
      staff_narrative: narrative,
    },
    score: tracked.completenessScore,
    completenessScore: tracked.completenessScore,
    filledFields: tracked.filled,
    missingFields: tracked.missing,
  }
}

export function ensureSessionAgentState(session: ReportSession): AgentState | null {
  return session.agentState ?? rebuildAgentStateFromSession(session)
}

export function agentStateFromIncidentSnapshot(
  snapshot: unknown,
  session: ReportSession,
): AgentState | null {
  if (snapshot && typeof snapshot === "object" && "global_standards" in snapshot) {
    return snapshot as AgentState
  }
  return rebuildAgentStateFromSession(session)
}
