import { eachDayOfInterval, eachWeekOfInterval, endOfDay, format, startOfDay } from "date-fns"
import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type {
  TrendsComplianceDriftBreakdownRow,
  TrendsComplianceDriftResponse,
  TrendsComplianceDriftSlip,
  TrendsComplianceDriftTimeseriesPoint,
} from "@/lib/types/trends-compliance-drift"

function unitKeyFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "Unknown"
  const wing = r.split(/[-/]/)[0]?.trim()
  if (wing && wing.length <= 8) return wing
  const first = r.split(/\s+/)[0]?.trim()
  return first || r.slice(0, 6)
}

function completenessFor(inc: IncidentSummary): number | null {
  if (inc.completenessScore == null && inc.completenessAtSignoff == null) return null
  return Math.min(100, Math.max(0, Math.round(Number(inc.completenessScore ?? inc.completenessAtSignoff ?? 0))))
}

function inStartedWindow(inc: IncidentSummary, win: TrendsPeriodWindow): boolean {
  const t = new Date(inc.startedAt).getTime()
  if (Number.isNaN(t)) return false
  return t >= win.start.getTime() && t <= win.end.getTime()
}

function avgCompleteness(incidents: IncidentSummary[]): number | null {
  const vals = incidents.map(completenessFor).filter((x): x is number => x != null)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function normalizeRole(role: string): { key: string; label: string } | null {
  const raw = role.trim().toLowerCase()
  if (!raw || raw === "staff" || raw === "admin") return null
  const labels: Record<string, string> = {
    rn: "RN",
    cna: "CNA",
    lpn: "LPN",
    don: "DON",
    nurse: "Nurse",
    manager: "Manager",
  }
  const label = labels[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return { key: raw, label }
}

function buildBreakdownRows(
  incidents: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  keyFn: (inc: IncidentSummary) => string,
  labelFn: (key: string) => string,
  minCurrentCount = 2,
): TrendsComplianceDriftBreakdownRow[] {
  const keys = new Set<string>()
  for (const inc of incidents) {
    if (inStartedWindow(inc, current) || inStartedWindow(inc, previous)) {
      keys.add(keyFn(inc))
    }
  }

  const rows: TrendsComplianceDriftBreakdownRow[] = []
  for (const key of keys) {
    const curPool = incidents.filter((i) => inStartedWindow(i, current) && keyFn(i) === key)
    const prevPool = incidents.filter((i) => inStartedWindow(i, previous) && keyFn(i) === key)
    if (curPool.length < minCurrentCount) continue
    const currentPercent = avgCompleteness(curPool)
    const previousPercent = avgCompleteness(prevPool)
    if (currentPercent == null) continue
    rows.push({
      key,
      label: labelFn(key),
      currentPercent,
      previousPercent: previousPercent ?? currentPercent,
      deltaPts: currentPercent - (previousPercent ?? currentPercent),
      currentCount: curPool.length,
    })
  }
  return rows.sort((a, b) => b.currentCount - a.currentCount)
}

function completionTrendSeries(
  incidents: IncidentSummary[],
  win: TrendsPeriodWindow,
  range: TrendsRangeKey,
): TrendsComplianceDriftTimeseriesPoint[] {
  const useWeekly = range === "90d"
  const points: TrendsComplianceDriftTimeseriesPoint[] = []

  if (useWeekly) {
    const weeks = eachWeekOfInterval(
      { start: startOfDay(win.start), end: startOfDay(win.end) },
      { weekStartsOn: 0 },
    )
    for (const wk of weeks) {
      const wkEnd = endOfDay(new Date(wk.getTime() + 6 * 24 * 60 * 60 * 1000))
      const bucket = incidents.filter((inc) => {
        const t = new Date(inc.startedAt).getTime()
        return !Number.isNaN(t) && t >= wk.getTime() && t <= Math.min(wkEnd.getTime(), win.end.getTime())
      })
      points.push({
        label: `Wk ${format(wk, "MMM d")}`,
        startIso: wk.toISOString(),
        avgCompletionPercent: avgCompleteness(bucket),
        sampleCount: bucket.length,
      })
    }
    return points
  }

  const days = eachDayOfInterval({ start: startOfDay(win.start), end: startOfDay(win.end) })
  for (const day of days) {
    const dayEnd = endOfDay(day)
    const bucket = incidents.filter((inc) => {
      const t = new Date(inc.startedAt).getTime()
      return !Number.isNaN(t) && t >= day.getTime() && t <= dayEnd.getTime()
    })
    points.push({
      label: format(day, "MMM d"),
      startIso: day.toISOString(),
      avgCompletionPercent: avgCompleteness(bucket),
      sampleCount: bucket.length,
    })
  }
  return points
}

function roleLabelForKey(key: string): string {
  return normalizeRole(key)?.label ?? key
}

function pickBiggestSlip(
  unitRows: TrendsComplianceDriftBreakdownRow[],
  othersUnit: TrendsComplianceDriftBreakdownRow | null,
  roleRows: TrendsComplianceDriftBreakdownRow[],
): TrendsComplianceDriftSlip | null {
  const unitKeys = new Set([...unitRows.map((r) => r.key), ...(othersUnit ? [othersUnit.key] : [])])
  const candidates: TrendsComplianceDriftSlip[] = []
  for (const row of [...unitRows, ...(othersUnit ? [othersUnit] : []), ...roleRows]) {
    if (row.deltaPts >= 0) continue
    candidates.push({
      kind: unitKeys.has(row.key) ? "unit" : "role",
      key: row.key,
      label: row.label,
      deltaPts: row.deltaPts,
      currentPercent: row.currentPercent,
      previousPercent: row.previousPercent,
    })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => a.deltaPts - b.deltaPts)
  return candidates[0]!
}

function splitTopUnits(
  allUnits: TrendsComplianceDriftBreakdownRow[],
): { top: TrendsComplianceDriftBreakdownRow[]; others: TrendsComplianceDriftBreakdownRow | null } {
  if (allUnits.length <= 3) return { top: allUnits, others: null }
  const top = allUnits.slice(0, 3)
  const rest = allUnits.slice(3)
  const curN = rest.reduce((s, r) => s + r.currentCount, 0)
  const curVals = rest.flatMap((r) => Array(r.currentCount).fill(r.currentPercent))
  const currentPercent = curVals.length ? Math.round(curVals.reduce((a, b) => a + b, 0) / curVals.length) : 0
  const prevWeighted = rest.reduce((s, r) => s + r.previousPercent * r.currentCount, 0)
  const previousPercent = curN > 0 ? Math.round(prevWeighted / curN) : currentPercent
  return {
    top,
    others: {
      key: "__others__",
      label: "Other units",
      currentPercent,
      previousPercent,
      deltaPts: currentPercent - previousPercent,
      currentCount: curN,
    },
  }
}

export function computeTrendsComplianceDriftResponse(
  incidents: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsComplianceDriftResponse {
  const curWindow = incidents.filter((i) => inStartedWindow(i, current))
  const prevWindow = incidents.filter((i) => inStartedWindow(i, previous))

  const allUnits = buildBreakdownRows(
    incidents,
    current,
    previous,
    (inc) => unitKeyFromRoom(inc.residentRoom || ""),
    (key) => key,
  )
  const { top: unitRows, others: othersUnit } = splitTopUnits(allUnits)

  const roleRows = buildBreakdownRows(
    incidents,
    current,
    previous,
    (inc) => normalizeRole(inc.reportedByRole || "")?.key ?? "__skip__",
    (key) => roleLabelForKey(key),
    2,
  ).filter((r) => r.key !== "__skip__")

  const biggestSlip = pickBiggestSlip(unitRows, othersUnit, roleRows)

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    currentAvgPercent: avgCompleteness(curWindow),
    previousAvgPercent: avgCompleteness(prevWindow),
    completionTrend: completionTrendSeries(incidents, current, range),
    unitRows,
    othersUnit,
    roleRows: roleRows.slice(0, 4),
    biggestSlip,
  }
}
