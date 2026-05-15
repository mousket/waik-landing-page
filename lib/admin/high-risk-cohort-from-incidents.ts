import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import type { RiskDriverKey } from "@/lib/types/trends-high-risk-cohort"
import type { IncidentSummary } from "@/lib/types/incident-summary"

export function residenceKeyFromIncident(inc: IncidentSummary): string {
  const id = inc.residentId?.trim()
  if (id) return `id:${id}`
  return `nm:${(inc.residentName || "").trim().toLowerCase()}|${(inc.residentRoom || "").trim().toLowerCase()}`
}

function isFallType(t: string): boolean {
  return /fall/i.test(t)
}

const LABEL_TO_KEY: Record<string, RiskDriverKey> = {
  "Injury on file": "injury",
  "Repeat falls": "repeat_falls",
  "Repeat similar events": "repeat_pattern",
  "Multiple open items": "multi_open",
  "Documentation pressure": "doc_pressure",
  "Thin intake": "thin_intake",
  "Phase 2 active": "phase_2_active",
  "Needs triage": "needs_triage",
}

/**
 * High-risk proxy from incidents **started in the window only** (retrospective cohort).
 * Mirrors Daily Command heuristics where applicable; uses current phase/doc fields on each row.
 */
export function evaluateHighRiskFromWindowIncidents(
  list: IncidentSummary[],
  nowMs: number,
): { isHighRisk: boolean; driverKeys: RiskDriverKey[] } {
  if (!list.length) return { isHighRisk: false, driverKeys: [] }

  const openN = list.length
  const injury = list.some((i) => i.hasInjury)
  const red = list.some((i) => classifyIncident(i, nowMs) === "red_alert")
  const typeCounts = new Map<string, number>()
  for (const i of list) {
    const t = (i.incidentType || "").toLowerCase()
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1)
  }
  let repeatPattern = false
  for (const [, c] of typeCounts) {
    if (c >= 2) {
      repeatPattern = true
      break
    }
  }
  const fallRepeat = list.filter((i) => isFallType(i.incidentType)).length >= 2
  const thin = list.some((i) => i.phase === "phase_1_in_progress" && (i.completenessScore ?? 0) < 50)
  const docPressure = list.some((i) => {
    const clock = computeClock(i.phase1SignedAt, 48, nowMs)
    return (
      (i.phase === "phase_2_in_progress" && clock?.status === "overdue") || incidentHasOverdueIdt(i, nowMs)
    )
  })
  const p2Open = list.some((i) => i.phase === "phase_2_in_progress")

  const sortScore =
    openN * 10 +
    (injury ? 45 : 0) +
    (red ? 35 : 0) +
    (repeatPattern ? 28 : 0) +
    (fallRepeat ? 22 : 0) +
    (thin ? 15 : 0) +
    (docPressure ? 20 : 0) +
    (p2Open ? 8 : 0)

  if (sortScore < 12 && openN < 2 && !injury) {
    return { isHighRisk: false, driverKeys: [] }
  }

  const driverLabels: string[] = []
  if (injury) driverLabels.push("Injury on file")
  if (fallRepeat) driverLabels.push("Repeat falls")
  else if (repeatPattern) driverLabels.push("Repeat similar events")
  if (openN >= 2) driverLabels.push("Multiple open items")
  if (docPressure) driverLabels.push("Documentation pressure")
  else if (thin) driverLabels.push("Thin intake")
  else if (p2Open) driverLabels.push("Phase 2 active")
  if (red) driverLabels.push("Needs triage")

  const driverKeys = driverLabels
    .map((l) => LABEL_TO_KEY[l])
    .filter((k): k is RiskDriverKey => Boolean(k))
    .slice(0, 3)

  return { isHighRisk: true, driverKeys }
}
