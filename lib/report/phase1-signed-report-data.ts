import type { ClinicalRecord } from "@/lib/agents/clinical-record-generator"
import type { ClinicalPreviewInsights } from "@/lib/agents/clinical-preview-insights"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import type { PreviewResponse } from "@/components/staff/clinical-report-preview"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import type { Question } from "@/lib/types"

const ENHANCED_LABELS: Array<{ label: string; key: keyof ClinicalRecord }> = [
  { label: "DESCRIPTION OF INCIDENT:", key: "narrative" },
  { label: "RESIDENT STATEMENT:", key: "residentStatement" },
  { label: "IMMEDIATE INTERVENTIONS:", key: "interventions" },
  { label: "CONTRIBUTING FACTORS:", key: "contributingFactors" },
  { label: "RECOMMENDATIONS:", key: "recommendations" },
  { label: "ENVIRONMENTAL ASSESSMENT:", key: "environmentalAssessment" },
]

const CLINICAL_RECORD_SECTION_TITLES: Array<{ key: keyof ClinicalRecord; title: string }> = [
  { key: "narrative", title: "Description of Incident" },
  { key: "residentStatement", title: "Resident Statement" },
  { key: "interventions", title: "Immediate Interventions" },
  { key: "contributingFactors", title: "Contributing Factors" },
  { key: "recommendations", title: "Recommendations" },
  { key: "environmentalAssessment", title: "Environmental Assessment" },
]

const EMPTY_CLINICAL_RECORD: ClinicalRecord = {
  narrative: "",
  residentStatement: "",
  interventions: "",
  contributingFactors: "",
  recommendations: "",
  environmentalAssessment: "",
}

export type Phase1SignedReportViewModel = {
  previewData: PreviewResponse
  signedSignature: {
    signatureImage?: string | null
    signedAt: string
    signedByName: string
    declaration?: string
  }
}

function formatIncidentDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split("T")[0]
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
    return value.trim()
  }
  return "—"
}

function formatSignedAt(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

function clinicalRecordFromEnhanced(enhanced?: string | null): ClinicalRecord {
  if (!enhanced?.trim()) return { ...EMPTY_CLINICAL_RECORD }
  const record = { ...EMPTY_CLINICAL_RECORD }
  for (let i = 0; i < ENHANCED_LABELS.length; i++) {
    const { label, key } = ENHANCED_LABELS[i]
    const start = enhanced.indexOf(label)
    if (start === -1) continue
    const contentStart = start + label.length
    const next = ENHANCED_LABELS[i + 1]?.label
    const end = next ? enhanced.indexOf(next, contentStart) : enhanced.length
    record[key] = enhanced.slice(contentStart, end === -1 ? undefined : end).trim()
  }
  return record
}

function questionsToQA(
  questions: Question[],
  group: "tier1" | "tier2" | "closing",
  defaultAreaHint: string,
) {
  return questions
    .filter((q) => staffQuestionGroup(q) === group)
    .filter((q) => q.answer?.answerText?.trim())
    .map((q) => ({
      question: q.questionText,
      answer: (q.answer?.answerText ?? "").trim(),
      areaHint: defaultAreaHint,
    }))
}

function previewInsightsFromSnapshot(
  snapshot: NonNullable<NonNullable<IncidentDocument["initialReport"]>["phase1SignoffSnapshot"]>,
): ClinicalPreviewInsights {
  return {
    expertNurseSummary: snapshot.expertNurseSummary,
    nurseRecommendations: snapshot.nurseRecommendations,
    administratorRecommendations: snapshot.administratorRecommendations,
  }
}

export function resolvePhase1ClinicalRecord(incident: IncidentDocument): ClinicalRecord {
  const ir = incident.initialReport
  const snapshot = ir?.phase1SignoffSnapshot
  return snapshot?.clinicalRecord
    ? { ...snapshot.clinicalRecord }
    : clinicalRecordFromEnhanced(ir?.enhancedNarrative)
}

export function resolvePhase1PreviewInsights(
  incident: IncidentDocument,
): ClinicalPreviewInsights | undefined {
  const snapshot = incident.initialReport?.phase1SignoffSnapshot
  return snapshot ? previewInsightsFromSnapshot(snapshot) : undefined
}

export function clinicalRecordToSections(
  record: ClinicalRecord,
): Array<{ title: string; body: string }> {
  return CLINICAL_RECORD_SECTION_TITLES.map(({ key, title }) => ({
    title,
    body: record[key]?.trim() || "—",
  }))
}

export function hasStructuredClinicalSections(record: ClinicalRecord): boolean {
  return clinicalRecordToSections(record).some((section) => section.body !== "—")
}

export function buildPhase1SignedReportViewModel(
  incident: IncidentDocument,
  facilityName: string,
): Phase1SignedReportViewModel {
  const ir = incident.initialReport
  const sig = ir?.signature
  const snapshot = ir?.phase1SignoffSnapshot

  const clinicalRecord = resolvePhase1ClinicalRecord(incident)

  const questions = (incident.questions ?? []).filter((q) => !q.metadata?.idt) as Question[]

  const incidentDate = formatIncidentDate(incident.incidentDate ?? incident.createdAt)
  const incidentTime =
    typeof incident.incidentTime === "string" && incident.incidentTime.trim()
      ? incident.incidentTime.trim()
      : incident.createdAt instanceof Date
        ? incident.createdAt.toTimeString().slice(0, 5)
        : "—"

  const previewData: PreviewResponse = {
    facilityName,
    clinicalRecord,
    incidentSummary: {
      incidentId: incident.id,
      incidentType: String(incident.incidentType ?? incident.title ?? "incident"),
      residentName: incident.residentName,
      residentRoom: incident.residentRoom,
      location: incident.location ?? "—",
      staffName: ir?.recordedByName ?? incident.staffName,
      staffRole: ir?.recordedByRole ?? "",
      incidentDate,
      incidentTime,
    },
    fullNarrative: ir?.narrative?.trim() ?? "",
    tier1QA: questionsToQA(questions, "tier1", "Narrative"),
    tier2QA: questionsToQA(questions, "tier2", "Follow-up"),
    closingQA: questionsToQA(questions, "closing", "Closing"),
    completenessScore: Number(incident.completenessAtSignoff ?? incident.completenessScore) || 0,
    previewInsights: resolvePhase1PreviewInsights(incident),
  }

  return {
    previewData,
    signedSignature: {
      signatureImage: sig?.signatureImage,
      signedAt: formatSignedAt(snapshot?.signedAt ?? sig?.signedAt),
      signedByName: sig?.signedByName ?? ir?.recordedByName ?? incident.staffName,
      declaration: sig?.declaration,
    },
  }
}
