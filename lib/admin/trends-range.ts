import { endOfDay, startOfDay, subDays } from "date-fns"

export type TrendsRangeKey = "7d" | "30d" | "90d"

const RANGE_DAYS: Record<TrendsRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

export function parseTrendsRangeParam(value: string | null | undefined): TrendsRangeKey {
  const v = (value || "").trim().toLowerCase()
  if (v === "7d" || v === "30d" || v === "90d") return v
  return "30d"
}

export function trendsRangeDayCount(key: TrendsRangeKey): number {
  return RANGE_DAYS[key]
}

export type TrendsPeriodWindow = {
  start: Date
  end: Date
}

/**
 * Current window = last N local calendar days ending today (inclusive).
 * Previous window = the N days immediately before the current window.
 */
export function computeTrendsPeriodWindows(
  now: Date,
  range: TrendsRangeKey,
): { current: TrendsPeriodWindow; previous: TrendsPeriodWindow } {
  const n = RANGE_DAYS[range]
  const endCurrent = endOfDay(now)
  const startCurrent = startOfDay(subDays(endCurrent, n - 1))
  const endPrevious = endOfDay(subDays(startCurrent, 1))
  const startPrevious = startOfDay(subDays(endPrevious, n - 1))
  return {
    current: { start: startCurrent, end: endCurrent },
    previous: { start: startPrevious, end: endPrevious },
  }
}
