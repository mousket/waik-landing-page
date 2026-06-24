import type { ClinicalRecord, ClinicalRecordInput } from "@/lib/agents/clinical-record-generator"
import {
  generateClinicalPreviewInsights,
  type ClinicalPreviewInsights,
} from "@/lib/agents/clinical-preview-insights"
import type { ReportSession } from "@/lib/config/report-session"
import type { Phase1SignoffSnapshot } from "@/lib/types"

const CLINICAL_RECORD_KEYS: (keyof ClinicalRecord)[] = [
  "narrative",
  "residentStatement",
  "interventions",
  "contributingFactors",
  "recommendations",
  "environmentalAssessment",
]

export function sessionToClinicalRecordInput(session: ReportSession): ClinicalRecordInput {
  return {
    fullNarrative: session.fullNarrative,
    tier1Questions: session.tier1Questions,
    tier1Answers: session.tier1Answers,
    tier2Questions: session.tier2Questions,
    tier2Answers: session.tier2Answers,
    closingQuestions: session.closingQuestions,
    closingAnswers: session.closingAnswers,
    incidentType: session.incidentType,
    residentName: session.residentName,
    location: session.location,
  }
}

export function applyEditedSections(
  record: ClinicalRecord,
  edited: Partial<Record<keyof ClinicalRecord, string>> | undefined,
): void {
  if (!edited) return
  for (const k of CLINICAL_RECORD_KEYS) {
    const v = edited[k]
    if (typeof v === "string" && v.trim()) {
      record[k] = v.trim()
    }
  }
}

export function buildPhase1SignoffSnapshot(
  clinicalRecord: ClinicalRecord,
  insights: ClinicalPreviewInsights,
  signedAt: Date,
): Phase1SignoffSnapshot {
  return {
    expertNurseSummary: insights.expertNurseSummary,
    nurseRecommendations: insights.nurseRecommendations,
    administratorRecommendations: insights.administratorRecommendations,
    clinicalRecord: { ...clinicalRecord },
    signedAt: signedAt.toISOString(),
  }
}

/** Mongo $set payload — dates stored as native Date objects. */
export function phase1SignoffSnapshotForMongo(snapshot: Phase1SignoffSnapshot) {
  return {
    expertNurseSummary: snapshot.expertNurseSummary,
    nurseRecommendations: snapshot.nurseRecommendations,
    administratorRecommendations: snapshot.administratorRecommendations,
    clinicalRecord: snapshot.clinicalRecord,
    signedAt: new Date(snapshot.signedAt),
  }
}

export async function resolvePreviewInsightsForSignoff(
  session: ReportSession,
  clinicalRecord: ClinicalRecord,
): Promise<ClinicalPreviewInsights> {
  if (session.generatedPreviewInsights) {
    return session.generatedPreviewInsights
  }
  return generateClinicalPreviewInsights(sessionToClinicalRecordInput(session), clinicalRecord)
}
