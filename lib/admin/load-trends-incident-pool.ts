import { startOfDay, subDays } from "date-fns"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { computeTrendsPeriodWindows, type TrendsRangeKey } from "@/lib/admin/trends-range"
import { mapIncidentDocToSummary } from "@/lib/map-incident-summary"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type { TrendsPeriodWindow } from "@/lib/admin/trends-range"

const startedAtExpr = () => ({ $ifNull: ["$startedAt", "$createdAt"] }) as const

export type TrendsIncidentPool = {
  incidents: IncidentSummary[]
  current: TrendsPeriodWindow
  previous: TrendsPeriodWindow
  range: TrendsRangeKey
  nowMs: number
}

/**
 * Single incident fetch for Trends aggregates: current + previous windows, plus 7d lookback
 * before the baseline start (repeat-within-7-days and similar metrics).
 */
export async function loadTrendsIncidentPool(
  facilityId: string,
  range: TrendsRangeKey,
  now: Date = new Date(),
): Promise<TrendsIncidentPool> {
  const { current, previous } = computeTrendsPeriodWindows(now, range)
  const fetchStart = startOfDay(subDays(previous.start, 7))
  const fetchEnd = current.end

  await connectMongo()

  const raw = await IncidentModel.find({
    facilityId,
    $expr: {
      $and: [{ $gte: [startedAtExpr(), fetchStart] }, { $lte: [startedAtExpr(), fetchEnd] }],
    },
  })
    .lean()
    .exec()

  const incidents = raw.map((doc) => mapIncidentDocToSummary(doc as unknown as Record<string, unknown>))

  return {
    incidents,
    current,
    previous,
    range,
    nowMs: now.getTime(),
  }
}
