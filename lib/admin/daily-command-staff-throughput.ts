import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import type { DailyCommandStaffThroughputSlice } from "@/lib/types/daily-command-today"
import type { IncidentSummary } from "@/lib/types/incident-summary"

function unitKeyFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "Unknown"
  const wing = r.split(/[-/]/)[0]?.trim()
  if (wing && wing.length <= 8) return wing
  const first = r.split(/\s+/)[0]?.trim()
  return first || r.slice(0, 6)
}

function incidentDocOverdue(inc: IncidentSummary, nowMs: number): boolean {
  const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
  if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") return true
  return incidentHasOverdueIdt(inc, nowMs)
}

export function buildDailyCommandStaffThroughputSlice(
  incidents: IncidentSummary[],
  nowMs: number,
): DailyCommandStaffThroughputSlice {
  const unitStrain = new Map<string, { strain: number; open: number }>()
  for (const inc of incidents) {
    const u = unitKeyFromRoom(inc.residentRoom || "")
    const row = unitStrain.get(u) ?? { strain: 0, open: 0 }
    row.open += 1
    if (incidentDocOverdue(inc, nowMs) || classifyIncident(inc, nowMs) === "red_alert") {
      row.strain += 1
    }
    unitStrain.set(u, row)
  }
  const units = [...unitStrain.entries()]
    .filter(([, v]) => v.strain >= 2 || v.open >= 4)
    .sort((a, b) => b[1].strain + b[1].open - (a[1].strain + a[1].open))
    .slice(0, 2)
    .map(([unit, v]) => ({ unit, strain: v.strain, open: v.open }))

  const unassignedPhase2 = incidents.filter(
    (i) => i.phase === "phase_2_in_progress" && !(i.investigatorName || "").trim(),
  ).length

  const thinPhase1Beyond12h = incidents.filter(
    (i) =>
      i.phase === "phase_1_in_progress" &&
      (i.completenessScore ?? 0) < 45 &&
      (nowMs - new Date(i.startedAt).getTime()) / (1000 * 60 * 60) > 12,
  ).length

  const reporterLoadMap = new Map<string, number>()
  for (const inc of incidents) {
    if (inc.phase !== "phase_1_in_progress") continue
    const hrs = (nowMs - new Date(inc.startedAt).getTime()) / (1000 * 60 * 60)
    if (hrs < 36) continue
    const who = (inc.reportedByName || "").trim() || "Unknown reporter"
    reporterLoadMap.set(who, (reporterLoadMap.get(who) ?? 0) + 1)
  }
  const reporterLoad = [...reporterLoadMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, n]) => ({
      name,
      detail: `${n} Phase 1 item${n === 1 ? "" : "s"} open beyond 36h — may need support wrapping up intake.`,
    }))

  return { units, unassignedPhase2, thinPhase1Beyond12h, reporterLoad }
}
