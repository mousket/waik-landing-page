import type { IncidentSummary } from "@/lib/types/incident-summary"
import { classifyIncident, isIdtOverdue } from "@/lib/utils/incident-classification"

export function incidentHasOverdueIdt(inc: IncidentSummary, nowMs: number): boolean {
  if (inc.phase !== "phase_2_in_progress") return false
  return inc.idtTeam.some((m) => isIdtOverdue(m, nowMs) && Boolean(m.questionSentAt))
}

export function isReadyForSignoff(inc: IncidentSummary): boolean {
  if (inc.phase !== "phase_2_in_progress") return false
  const s = inc.phase2Sections
  return (
    s.contributingFactors.status === "complete" &&
    s.rootCause.status === "complete" &&
    s.interventionReview.status === "complete" &&
    s.newIntervention.status === "complete"
  )
}

export function hoursOpenLabel(startedAt: string, nowMs: number): string {
  const t = new Date(startedAt).getTime()
  if (Number.isNaN(t)) return ""
  const h = Math.floor(Math.max(0, (nowMs - t) / (1000 * 60 * 60)))
  if (h < 1) return "<1h open"
  if (h === 1) return "1h open"
  return `${h}h open`
}

export function isInTodayAttentionQueue(inc: IncidentSummary, nowMs: number): boolean {
  if (isReadyForSignoff(inc)) return true
  const u = classifyIncident(inc, nowMs)
  if (u === "red_alert" || u === "yellow_awaiting") return true
  if (incidentHasOverdueIdt(inc, nowMs)) return true
  return false
}

export type AttentionQueueGroupKey = "ready_for_signoff" | "missing_info" | "awaiting_followup"

/** Single bucket per incident for Daily Command A3 (v1). */
export function attentionQueueGroupKey(inc: IncidentSummary, nowMs: number): AttentionQueueGroupKey | null {
  if (!isInTodayAttentionQueue(inc, nowMs)) return null
  if (isReadyForSignoff(inc)) return "ready_for_signoff"
  if (inc.phase === "phase_1_in_progress") return "missing_info"
  return "awaiting_followup"
}
