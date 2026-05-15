import { eachDayOfInterval, eachWeekOfInterval, endOfDay, format, startOfDay } from "date-fns"
import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type {
  ThroughputBottleneckKey,
  TrendsStaffingBacklogPoint,
  TrendsStaffingBottleneckRow,
  TrendsStaffingThroughputResponse,
  TrendsStaffingUnitStrainRow,
} from "@/lib/types/trends-staffing-throughput"
import { THROUGHPUT_BOTTLENECK_LABEL } from "@/lib/types/trends-staffing-throughput"

function unitKeyFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "Unknown"
  const wing = r.split(/[-/]/)[0]?.trim()
  if (wing && wing.length <= 8) return wing
  const first = r.split(/\s+/)[0]?.trim()
  return first || r.slice(0, 6)
}

function inStartedWindow(inc: IncidentSummary, win: TrendsPeriodWindow): boolean {
  const t = new Date(inc.startedAt).getTime()
  if (Number.isNaN(t)) return false
  return t >= win.start.getTime() && t <= win.end.getTime()
}

function incidentDocOverdue(inc: IncidentSummary, nowMs: number): boolean {
  const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
  if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") return true
  return incidentHasOverdueIdt(inc, nowMs)
}

function completenessOf(inc: IncidentSummary): number {
  return Math.round(inc.completenessScore ?? inc.completenessAtSignoff ?? 0)
}

function bottleneckHits(inc: IncidentSummary, nowMs: number): ThroughputBottleneckKey[] {
  const hits: ThroughputBottleneckKey[] = []
  if (incidentHasOverdueIdt(inc, nowMs)) hits.push("awaiting_followup")
  if (inc.phase === "phase_1_in_progress" && completenessOf(inc) < 50) hits.push("missing_info")
  if (inc.phase === "phase_2_in_progress" && !(inc.investigatorName || "").trim()) {
    hits.push("missing_assignment")
  }
  const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
  if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") hits.push("regulatory_clock")
  return hits
}

export function incidentMatchesBottleneck(
  inc: IncidentSummary,
  key: ThroughputBottleneckKey,
  nowMs: number,
): boolean {
  return bottleneckHits(inc, nowMs).includes(key)
}

function countBottlenecks(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  nowMs: number,
): Record<ThroughputBottleneckKey, number> {
  const counts: Record<ThroughputBottleneckKey, number> = {
    missing_info: 0,
    awaiting_followup: 0,
    missing_assignment: 0,
    regulatory_clock: 0,
  }
  for (const inc of pool) {
    if (!inStartedWindow(inc, win)) continue
    for (const k of bottleneckHits(inc, nowMs)) counts[k] += 1
  }
  return counts
}

function overdueInWindow(pool: IncidentSummary[], win: TrendsPeriodWindow, nowMs: number): number {
  let n = 0
  for (const inc of pool) {
    if (!inStartedWindow(inc, win)) continue
    if (incidentDocOverdue(inc, nowMs)) n += 1
  }
  return n
}

function backlogTrendSeries(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsStaffingBacklogPoint[] {
  const useWeekly = range === "90d"
  if (useWeekly) {
    const weeks = eachWeekOfInterval(
      { start: startOfDay(win.start), end: startOfDay(win.end) },
      { weekStartsOn: 0 },
    )
    return weeks.map((wk) => {
      const wkEnd = endOfDay(new Date(wk.getTime() + 6 * 24 * 60 * 60 * 1000))
      const endMs = Math.min(wkEnd.getTime(), win.end.getTime())
      let overdueCount = 0
      for (const inc of pool) {
        const t = new Date(inc.startedAt).getTime()
        if (Number.isNaN(t) || t > endMs) continue
        if (t >= wk.getTime() && incidentDocOverdue(inc, endMs)) overdueCount += 1
      }
      return {
        label: `Wk ${format(wk, "MMM d")}`,
        startIso: wk.toISOString(),
        overdueCount,
      }
    })
  }

  const days = eachDayOfInterval({ start: startOfDay(win.start), end: startOfDay(win.end) })
  return days.map((day) => {
    const dayEnd = endOfDay(day)
    const endMs = dayEnd.getTime()
    let overdueCount = 0
    for (const inc of pool) {
      const t = new Date(inc.startedAt).getTime()
      if (Number.isNaN(t) || t > endMs) continue
      if (t >= day.getTime() && incidentDocOverdue(inc, endMs)) overdueCount += 1
    }
    return {
      label: format(day, "MMM d"),
      startIso: day.toISOString(),
      overdueCount,
    }
  })
}

function unitStrainForWindow(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  nowMs: number,
): Map<string, { strain: number; open: number }> {
  const unitStrain = new Map<string, { strain: number; open: number }>()
  for (const inc of pool) {
    if (!inStartedWindow(inc, win)) continue
    const u = unitKeyFromRoom(inc.residentRoom || "")
    if (u === "Unknown") continue
    const row = unitStrain.get(u) ?? { strain: 0, open: 0 }
    row.open += 1
    if (incidentDocOverdue(inc, nowMs) || classifyIncident(inc, nowMs) === "red_alert") {
      row.strain += 1
    }
    unitStrain.set(u, row)
  }
  return unitStrain
}

export function computeTrendsStaffingThroughputResponse(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsStaffingThroughputResponse {
  const curB = countBottlenecks(pool, current, nowMs)
  const prevB = countBottlenecks(pool, previous, nowMs)

  const bottleneckRows: TrendsStaffingBottleneckRow[] = (
    Object.keys(THROUGHPUT_BOTTLENECK_LABEL) as ThroughputBottleneckKey[]
  )
    .map((key) => ({
      key,
      label: THROUGHPUT_BOTTLENECK_LABEL[key],
      count: curB[key],
      deltaVsPrevious: curB[key] - prevB[key],
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const curUnits = unitStrainForWindow(pool, current, nowMs)
  const prevUnits = unitStrainForWindow(pool, previous, nowMs)

  const unitStrainRows: TrendsStaffingUnitStrainRow[] = [...curUnits.entries()]
    .filter(([, v]) => v.strain >= 1 || v.open >= 3)
    .sort((a, b) => b[1].strain + b[1].open - (a[1].strain + a[1].open))
    .slice(0, 2)
    .map(([unit, v]) => ({
      unit,
      strain: v.strain,
      open: v.open,
      deltaStrainVsPrevious: v.strain - (prevUnits.get(unit)?.strain ?? 0),
    }))

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    backlogTrend: backlogTrendSeries(pool, current, range, nowMs),
    currentOverdueCount: overdueInWindow(pool, current, nowMs),
    previousOverdueCount: overdueInWindow(pool, previous, nowMs),
    bottleneckRows,
    unitStrainRows,
  }
}
