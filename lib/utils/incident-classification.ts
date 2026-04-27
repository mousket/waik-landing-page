import type { IdtTeamMember, IncidentSummary } from "@/lib/types/incident-summary"

export type IncidentUrgency = "red_alert" | "yellow_awaiting" | "none"

export function classifyIncident(incident: IncidentSummary, nowMs: number = Date.now()): IncidentUrgency {
  const startedMs = new Date(incident.startedAt).getTime()
  const hoursOpen = (nowMs - startedMs) / (1000 * 60 * 60)

  if (incident.hasInjury) return "red_alert"
  if (incident.phase === "phase_1_in_progress" && hoursOpen > 4) return "red_alert"
  if (incident.phase === "phase_1_complete" && !incident.hasInjury) return "yellow_awaiting"

  return "none"
}

export function isIdtOverdue(
  member: IdtTeamMember,
  nowMs: number = Date.now(),
  thresholdHours: number = 24,
): boolean {
  if (member.status === "answered") return false
  if (!member.questionSentAt) return false
  const sentMs = new Date(member.questionSentAt).getTime()
  const hoursElapsed = (nowMs - sentMs) / (1000 * 60 * 60)
  return hoursElapsed > thresholdHours
}

/** 48hr regulatory clock derived from Phase 1 sign-off (task-06c). */
export type ClockStatus = "gray" | "amber" | "red" | "overdue"

export interface ClockState {
  hoursRemaining: number
  status: ClockStatus
  label: string
}

function formatOverdueHours(overdueHours: number): string {
  const whole = Math.floor(Math.max(0, overdueHours))
  if (whole < 24) return `${whole}h`
  const days = Math.floor(whole / 24)
  const hours = whole % 24
  if (hours === 0) return `${days}d`
  return `${days}d ${hours}h`
}

export function computeClock(
  phase1SignedAt: string | null,
  goldStandardHours: number = 48,
  nowMs: number = Date.now(),
): ClockState | null {
  if (!phase1SignedAt) return null

  const signedMs = new Date(phase1SignedAt).getTime()
  const elapsedHours = (nowMs - signedMs) / (1000 * 60 * 60)
  const hoursRemaining = goldStandardHours - elapsedHours

  if (hoursRemaining <= 0) {
    const overdueHours = Math.abs(hoursRemaining)
    return {
      hoursRemaining,
      status: "overdue",
      label: `Overdue by ${formatOverdueHours(overdueHours)}`,
    }
  }

  const h = Math.floor(hoursRemaining)
  const label = `${h}h remaining`

  if (hoursRemaining < 6) return { hoursRemaining, status: "red", label }
  if (hoursRemaining < 24) return { hoursRemaining, status: "amber", label }
  return { hoursRemaining, status: "gray", label }
}
