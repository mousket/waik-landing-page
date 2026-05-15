import { classifyIncident, isIdtOverdue } from "@/lib/utils/incident-classification"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { DailyCommandProtectionLevel, DailyCommandSnapshotHeader } from "@/lib/types/daily-command-today"
import type { IncidentSummary } from "@/lib/types/incident-summary"

function isSameLocalCalendarDay(iso: string, now = new Date()): boolean {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return false
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  )
}

function sameResident(a: IncidentSummary, b: IncidentSummary): boolean {
  const n = (a.residentName || "").trim() === (b.residentName || "").trim()
  const r = (a.residentRoom || "").trim() === (b.residentRoom || "").trim()
  return n && r && Boolean((a.residentName || "").trim())
}

function isRepeatWithin7Days(inc: IncidentSummary, all: IncidentSummary[]): boolean {
  const start = new Date(inc.startedAt).getTime()
  if (Number.isNaN(start)) return false
  const windowStart = start - 7 * 24 * 60 * 60 * 1000
  return all.some((o) => {
    if (o.id === inc.id) return false
    if (!sameResident(o, inc)) return false
    const t = new Date(o.startedAt).getTime()
    return !Number.isNaN(t) && t >= windowStart && t < start
  })
}

function countRepeatsWithin7Days(incidents: IncidentSummary[]): number {
  return incidents.reduce((acc, inc) => acc + (isRepeatWithin7Days(inc, incidents) ? 1 : 0), 0)
}

/**
 * A1 “Command snapshot” counts (matches `AdminCommandHeaderCard` metrics).
 */
export function computeDailyCommandSnapshotHeader(
  incidents: IncidentSummary[],
  stats: DashboardStats | null,
  statsLoading: boolean,
  nowMs = Date.now(),
): DailyCommandSnapshotHeader {
  const red: IncidentSummary[] = []
  const yellow: IncidentSummary[] = []
  let overdueIdt = 0

  for (const inc of incidents) {
    const u = classifyIncident(inc, nowMs)
    if (u === "red_alert") red.push(inc)
    else if (u === "yellow_awaiting") yellow.push(inc)
  }

  for (const inc of incidents) {
    if (inc.phase !== "phase_2_in_progress") continue
    for (const m of inc.idtTeam) {
      if (isIdtOverdue(m, nowMs) && m.questionSentAt) overdueIdt += 1
    }
  }

  const incidentsToday = incidents.filter((i) => isSameLocalCalendarDay(i.startedAt)).length

  let protection: DailyCommandProtectionLevel = "protected"
  if (red.length > 0) {
    protection = "exposed"
  } else if (overdueIdt > 0 || yellow.length > 0) {
    protection = "at_risk"
  }
  if (protection !== "exposed" && stats && !statsLoading) {
    if (stats.avgCompleteness30d < 70) protection = "exposed"
    else if (stats.avgCompleteness30d < 85 && protection === "protected") protection = "at_risk"
  }

  return {
    criticalOpen: red.length,
    overdueDocs: overdueIdt,
    incidentsToday,
    protection,
    repeatsWithin7Days: countRepeatsWithin7Days(incidents),
  }
}
