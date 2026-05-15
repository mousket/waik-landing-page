import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import type { DailyCommandHighRiskResidentItem } from "@/lib/types/daily-command-today"
import type { IncidentSummary } from "@/lib/types/incident-summary"

function residenceKey(inc: IncidentSummary): string {
  const id = inc.residentId?.trim()
  if (id) return `id:${id}`
  return `nm:${(inc.residentName || "").trim().toLowerCase()}|${(inc.residentRoom || "").trim().toLowerCase()}`
}

function unitFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "—"
  const wing = r.split(/[-/]/)[0]?.trim()
  return wing && wing.length <= 8 ? wing : r.split(/\s+/)[0]?.trim() || r.slice(0, 6)
}

function isFallType(t: string): boolean {
  return /fall/i.test(t)
}

export function buildDailyCommandHighRiskResidents(
  incidents: IncidentSummary[],
  searchParams: URLSearchParams,
  nowMs: number,
): DailyCommandHighRiskResidentItem[] {
  const by = new Map<string, IncidentSummary[]>()
  for (const inc of incidents) {
    const k = residenceKey(inc)
    const arr = by.get(k) ?? []
    arr.push(inc)
    by.set(k, arr)
  }

  const rows: DailyCommandHighRiskResidentItem[] = []
  for (const [key, list] of by) {
    const first = list[0]!
    const name = first.residentName?.trim() || "Resident"
    const room = first.residentRoom?.trim() || "—"
    const unit = unitFromRoom(room)
    const residentId = list.find((i) => i.residentId?.trim())?.residentId?.trim()

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

    if (sortScore < 12 && openN < 2 && !injury) continue

    const drivers: string[] = []
    if (injury) drivers.push("Injury on file")
    if (fallRepeat) drivers.push("Repeat falls")
    else if (repeatPattern) drivers.push("Repeat similar events")
    if (openN >= 2) drivers.push("Multiple open items")
    if (docPressure) drivers.push("Documentation pressure")
    else if (thin) drivers.push("Thin intake")
    else if (p2Open) drivers.push("Phase 2 active")
    if (red) drivers.push("Needs triage")
    const driversFinal = drivers.slice(0, 3)

    let whyNow = ""
    if (injury && openN >= 2) {
      whyNow = "Injury history plus more than one open item — worth a coordinated pass today."
    } else if (docPressure && openN >= 1) {
      whyNow = "Documentation clocks or IDT responses need attention alongside this resident's work."
    } else if (fallRepeat) {
      whyNow = "More than one fall-related report is on the board — pattern deserves a safety check-in."
    } else if (repeatPattern) {
      whyNow = "Similar incident types clustered — a quick review can prevent escalation."
    } else if (openN >= 2) {
      whyNow = "Several concurrent items make this resident easy to lose track of without a bundle review."
    } else if (thin) {
      whyNow = "Phase 1 completeness is thin — a nudge now saves rework later."
    } else {
      whyNow = "Open work tied to this resident is elevated in today's snapshot."
    }

    const bundleHref = buildAdminPathWithContext(
      residentId ? `/admin/residents/${encodeURIComponent(residentId)}` : "/admin/residents?risk=high",
      searchParams,
    )

    rows.push({
      key,
      residentId,
      name,
      room,
      unit,
      drivers: driversFinal,
      whyNow,
      bundleHref,
      sortScore,
    })
  }

  return rows
}
