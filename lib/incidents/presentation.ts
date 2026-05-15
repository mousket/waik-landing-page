import { format, isToday } from "date-fns"

export function displayIncidentType(raw: string) {
  const normalized = (raw || "").replace(/[_-]+/g, " ").trim()
  if (!normalized) return "Report"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function displayIncidentPhase(phase: string): string {
  switch (phase) {
    case "phase_1_in_progress":
      return "Phase 1 in progress"
    case "phase_1_complete":
      return "Phase 1 complete"
    case "phase_2_in_progress":
      return "Phase 2"
    case "closed":
      return "Closed"
    default:
      return (phase || "").replace(/_/g, " ") || "—"
  }
}

export function displayIncidentPhaseShort(phase: string): string {
  switch (phase) {
    case "phase_1_in_progress":
      return "P1 ongoing"
    case "phase_1_complete":
      return "P1 complete"
    case "phase_2_in_progress":
      return "Phase 2"
    case "closed":
      return "Closed"
    default:
      return (phase || "").replace(/_/g, " ") || "—"
  }
}

export function formatIncidentListDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const started = new Date(iso)
  if (Number.isNaN(started.getTime())) return "—"
  return isToday(started) ? "Today" : format(started, "MMM d, yyyy")
}
