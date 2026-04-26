import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

export function hasPendingQuestions(incident: StaffIncidentSummary): boolean {
  return incident.phase === "phase_1_in_progress" && incident.completenessScore < 100
}

export function getPendingQuestionCount(incident: StaffIncidentSummary): number {
  const remaining = Math.max(1, incident.tier2QuestionsGenerated - incident.questionsAnswered)
  return remaining
}

export function hasUnfinishedReport(incident: StaffIncidentSummary): boolean {
  return incident.phase === "phase_1_in_progress"
}

export function getPhaseDotColor(phase: StaffIncidentSummary["phase"] | string): string {
  switch (phase) {
    case "phase_1_in_progress":
      return "#E8A838" // amber
    case "phase_1_complete":
      return "#F4D03F" // yellow
    case "phase_2_in_progress":
      return "#2E86DE" // blue
    case "closed":
      return "#0D7377" // teal
    default:
      return "#9CA3AF" // gray
  }
}

