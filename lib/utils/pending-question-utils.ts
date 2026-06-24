import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

export function hasPendingQuestions(incident: StaffIncidentSummary): boolean {
  return incident.phase === "phase_1_in_progress" && incident.completenessScore < 100
}

export function getPendingQuestionCount(incident: StaffIncidentSummary): number {
  if (incident.phase !== "phase_1_in_progress") return 0
  return Math.max(0, incident.pendingQuestionCount)
}

export type PendingQuestionPhaseLine = {
  label: string
  detail: string
  /** Drives amber vs default styling on dashboard breakdown lines. */
  tone?: "default" | "deferred"
}

export function formatTier2PendingDetail(
  tier2Generated: boolean,
  unanswered: number,
  deferred: number,
): string {
  if (!tier2Generated) return "not generated"
  if (unanswered === 0 && deferred === 0) return "complete"
  if (unanswered > 0 && deferred > 0) {
    return `${unanswered} left · ${deferred} deferred`
  }
  if (deferred > 0) return `${deferred} deferred`
  return `${unanswered} left`
}

/** Per-phase lines for dashboard incident holders. */
export function buildPendingQuestionPhaseLines(
  incident: StaffIncidentSummary,
): PendingQuestionPhaseLine[] | null {
  if (incident.phase !== "phase_1_in_progress") return null

  const tier1 = incident.pendingTier1Count
  const tier2Unanswered = incident.pendingTier2UnansweredCount
  const tier2Deferred = incident.pendingTier2DeferredCount
  const closing = incident.pendingClosingCount
  const tier2Detail = formatTier2PendingDetail(
    incident.tier2Generated,
    tier2Unanswered,
    tier2Deferred,
  )

  return [
    {
      label: "Tier 1",
      detail: tier1 > 0 ? `${tier1} left` : "complete",
    },
    {
      label: "Tier 2",
      detail: tier2Detail,
      tone: tier2Deferred > 0 && tier2Unanswered === 0 ? "deferred" : "default",
    },
    {
      label: "Closing",
      detail: closing > 0 ? `${closing} left` : "complete",
    },
  ]
}

export type PendingQuestionHeadline = {
  text: string
  tone: "urgent" | "deferred" | "ok"
}

export function hasAssignedIdtQuestions(incident: StaffIncidentSummary): boolean {
  return incident.hasAssignedTask && incident.pendingQuestionCount > 0
}

export function getPendingQuestionHeadline(incident: StaffIncidentSummary): PendingQuestionHeadline {
  if (incident.phase !== "phase_1_in_progress") {
    if (hasAssignedIdtQuestions(incident)) {
      const n = incident.pendingQuestionCount
      return {
        text: `${n} team question${n === 1 ? "" : "s"} for you`,
        tone: "urgent",
      }
    }
    return { text: "On track", tone: "ok" }
  }

  const total = getPendingQuestionCount(incident)
  if (total <= 0) {
    return { text: "On track", tone: "ok" }
  }

  const unanswered =
    incident.pendingTier1Count +
    incident.pendingTier2UnansweredCount +
    incident.pendingClosingCount
  const deferred = incident.pendingTier2DeferredCount

  if (unanswered === 0 && deferred > 0) {
    return {
      text: `${deferred} deferred question${deferred === 1 ? "" : "s"}`,
      tone: "deferred",
    }
  }
  if (deferred > 0) {
    return {
      text: `${total} remaining (${unanswered} left · ${deferred} deferred)`,
      tone: "urgent",
    }
  }
  return {
    text: `${total} question${total === 1 ? "" : "s"} left`,
    tone: "urgent",
  }
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

export function shortIncidentRef(id: string): string {
  const trimmed = id.trim()
  if (trimmed.length <= 8) return trimmed.toUpperCase()
  return trimmed.slice(-6).toUpperCase()
}
