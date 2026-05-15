import { eachDayOfInterval, eachWeekOfInterval, endOfDay, format, isSameDay, startOfDay } from "date-fns"
import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import {
  evaluateHighRiskFromWindowIncidents,
  residenceKeyFromIncident,
} from "@/lib/admin/high-risk-cohort-from-incidents"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type {
  RiskDriverKey,
  TrendsHighRiskCohortResponse,
  TrendsHighRiskCohortTimeseriesPoint,
  TrendsHighRiskDriverRow,
} from "@/lib/types/trends-high-risk-cohort"
import { RISK_DRIVER_LABEL } from "@/lib/types/trends-high-risk-cohort"

function inStartedWindow(inc: IncidentSummary, win: TrendsPeriodWindow): boolean {
  const t = new Date(inc.startedAt).getTime()
  if (Number.isNaN(t)) return false
  return t >= win.start.getTime() && t <= win.end.getTime()
}

function groupIncidentsByResidenceInWindow(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
): Map<string, IncidentSummary[]> {
  const m = new Map<string, IncidentSummary[]>()
  for (const inc of pool) {
    if (!inStartedWindow(inc, win)) continue
    const k = residenceKeyFromIncident(inc)
    const arr = m.get(k) ?? []
    arr.push(inc)
    m.set(k, arr)
  }
  return m
}

/** Exported for `/admin/residents` drilldown filtering. */
export function buildCohortDriverMap(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  nowMs: number,
): Map<string, RiskDriverKey[]> {
  const grouped = groupIncidentsByResidenceInWindow(pool, win)
  const out = new Map<string, RiskDriverKey[]>()
  for (const [key, list] of grouped) {
    const { isHighRisk, driverKeys } = evaluateHighRiskFromWindowIncidents(list, nowMs)
    if (isHighRisk) out.set(key, driverKeys)
  }
  return out
}

function cohortTrendSeries(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  cohortKeys: Set<string>,
  range: TrendsRangeKey,
): TrendsHighRiskCohortTimeseriesPoint[] {
  const useWeekly = range === "90d"
  if (useWeekly) {
    const weeks = eachWeekOfInterval(
      { start: startOfDay(win.start), end: startOfDay(win.end) },
      { weekStartsOn: 0 },
    )
    const points: TrendsHighRiskCohortTimeseriesPoint[] = []
    for (const wk of weeks) {
      const wkEnd = endOfDay(new Date(wk.getTime() + 6 * 24 * 60 * 60 * 1000))
      const keys = new Set<string>()
      for (const inc of pool) {
        if (!cohortKeys.has(residenceKeyFromIncident(inc))) continue
        const t = new Date(inc.startedAt).getTime()
        if (Number.isNaN(t)) continue
        if (t >= wk.getTime() && t <= Math.min(wkEnd.getTime(), win.end.getTime())) {
          keys.add(residenceKeyFromIncident(inc))
        }
      }
      points.push({
        label: `Wk ${format(wk, "MMM d")}`,
        startIso: wk.toISOString(),
        residentCount: keys.size,
      })
    }
    return points
  }

  const days = eachDayOfInterval({ start: startOfDay(win.start), end: startOfDay(win.end) })
  return days.map((day) => {
    const keys = new Set<string>()
    for (const inc of pool) {
      if (!cohortKeys.has(residenceKeyFromIncident(inc))) continue
      if (isSameDay(new Date(inc.startedAt), day)) keys.add(residenceKeyFromIncident(inc))
    }
    return {
      label: format(day, "MMM d"),
      startIso: day.toISOString(),
      residentCount: keys.size,
    }
  })
}

export function computeTrendsHighRiskCohortResponse(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsHighRiskCohortResponse {
  const curMap = buildCohortDriverMap(pool, current, nowMs)
  const prevMap = buildCohortDriverMap(pool, previous, nowMs)
  const curKeys = new Set(curMap.keys())
  const prevKeys = new Set(prevMap.keys())
  let newlyFlaggedCount = 0
  for (const k of curKeys) {
    if (!prevKeys.has(k)) newlyFlaggedCount += 1
  }

  const driverCount = new Map<RiskDriverKey, number>()
  for (const keys of curMap.values()) {
    for (const d of keys) {
      driverCount.set(d, (driverCount.get(d) ?? 0) + 1)
    }
  }
  const prevDriverCount = new Map<RiskDriverKey, number>()
  for (const keys of prevMap.values()) {
    for (const d of keys) {
      prevDriverCount.set(d, (prevDriverCount.get(d) ?? 0) + 1)
    }
  }

  const driverRows: TrendsHighRiskDriverRow[] = [...driverCount.entries()]
    .map(([key, residentCount]) => ({
      key,
      label: RISK_DRIVER_LABEL[key],
      residentCount,
      deltaVsPrevious: residentCount - (prevDriverCount.get(key) ?? 0),
    }))
    .sort((a, b) => b.residentCount - a.residentCount)
    .slice(0, 3)

  const cohortTrend = cohortTrendSeries(pool, current, curKeys, range)

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    cohortCountCurrent: curKeys.size,
    cohortCountPrevious: prevKeys.size,
    newlyFlaggedCount,
    cohortTrend,
    driverRows,
  }
}
