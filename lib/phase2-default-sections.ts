import type { IncidentPhase2Sections } from "@/lib/types"

export function defaultPhase2Sections(): IncidentPhase2Sections {
  return {
    contributingFactors: { status: "not_started", factors: [] },
    rootCause: { status: "not_started" },
    interventionReview: { status: "not_started", reviewedInterventions: [] },
    newIntervention: { status: "not_started", interventions: [] },
  }
}

const URL_TO_KEY: Record<string, keyof IncidentPhase2Sections> = {
  "contributing-factors": "contributingFactors",
  "root-cause": "rootCause",
  "intervention-review": "interventionReview",
  "new-intervention": "newIntervention",
}

export function sectionNameFromParam(param: string): keyof IncidentPhase2Sections | null {
  return URL_TO_KEY[param] ?? null
}
