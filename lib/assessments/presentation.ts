import type { AssessmentSummary } from "@/lib/types/assessment-summary"

const MS_PER_DAY = 86400000

export type SupportedStaffAssessmentType = "activity" | "dietary"

export function isStaffSupportedAssessmentType(value: string): value is SupportedStaffAssessmentType {
  return value === "activity" || value === "dietary"
}

export function displayAssessmentType(raw: string) {
  const normalized = (raw || "").replace(/_/g, " ").trim()
  if (!normalized) return "Assessment"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function displayAssessmentStatus(raw: string) {
  return (raw || "").replace(/_/g, " ") || "—"
}

export function isAssessmentStatusTerminal(status: string): boolean {
  const normalized = status.toLowerCase()
  return normalized.includes("complete") || normalized.includes("done") || normalized.includes("closed")
}

export function getAssessmentDueUrgency(nextDueAt: string | null, status: string): "none" | "overdue" | "due_soon" {
  if (!nextDueAt || isAssessmentStatusTerminal(status)) return "none"
  const nextDueTime = new Date(nextDueAt).getTime()
  const now = Date.now()
  if (nextDueTime < now) return "overdue"
  if (nextDueTime - now <= 7 * MS_PER_DAY) return "due_soon"
  return "none"
}

export function assessmentStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized.includes("complete") || normalized.includes("done") || normalized.includes("closed")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
  }
  if (normalized.includes("overdue") || normalized.includes("late")) {
    return "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  }
  if (normalized.includes("pending") || normalized.includes("due") || normalized.includes("open") || normalized.includes("scheduled")) {
    return "border-primary/40 bg-primary/5 text-foreground"
  }
  return "border-border text-muted-foreground"
}

export function buildStaffAssessmentHref(assessment: Pick<AssessmentSummary, "assessmentType" | "residentId" | "residentName" | "residentRoom">) {
  if (!isStaffSupportedAssessmentType(assessment.assessmentType)) {
    return null
  }
  const query = new URLSearchParams({
    residentId: assessment.residentId,
    residentName: (assessment.residentName || "Resident").trim() || "Resident",
    residentRoom: assessment.residentRoom || "",
  })
  return `/staff/assessments/${assessment.assessmentType}?${query.toString()}`
}

export function mapAssessmentDocToSummary(doc: Record<string, unknown>): AssessmentSummary {
  const conductedAt = doc.conductedAt ? new Date(String(doc.conductedAt)) : null
  const nextDueAt = doc.nextDueAt ? new Date(String(doc.nextDueAt)) : null
  const assessmentType = String(doc.assessmentType ?? "")

  return {
    id: String(doc.id ?? ""),
    residentId: String(doc.residentId ?? ""),
    residentName: String(doc.residentName ?? ""),
    residentRoom: String(doc.residentRoom ?? ""),
    assessmentType,
    status: String(doc.status ?? ""),
    conductedAt: conductedAt && !Number.isNaN(conductedAt.getTime()) ? conductedAt.toISOString() : null,
    nextDueAt: nextDueAt && !Number.isNaN(nextDueAt.getTime()) ? nextDueAt.toISOString() : null,
    conductedByName: String(doc.conductedByName ?? ""),
    completenessScore: Number(doc.completenessScore ?? 0),
    supportedForStaff: isStaffSupportedAssessmentType(assessmentType),
  }
}
