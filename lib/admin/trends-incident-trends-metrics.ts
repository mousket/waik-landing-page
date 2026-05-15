import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import { mapIncidentTypeToTrendBucket } from "@/lib/admin/trends-incident-type-buckets"
import { classifyIncident } from "@/lib/utils/incident-classification"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type {
  TrendsIncidentTrendsResponse,
  TrendsIncidentSeverityMix,
  TrendsIncidentTypeRow,
  IncidentTrendBucket,
} from "@/lib/types/trends-incident-trends"

function inStartedWindow(inc: IncidentSummary, win: TrendsPeriodWindow): boolean {
  const t = new Date(inc.startedAt).getTime()
  if (Number.isNaN(t)) return false
  return t >= win.start.getTime() && t <= win.end.getTime()
}

function emptySeverity(): TrendsIncidentSeverityMix {
  return { critical: 0, warning: 0, normal: 0 }
}

function severityMixForWindow(
  incidents: IncidentSummary[],
  win: TrendsPeriodWindow,
  nowMs: number,
): TrendsIncidentSeverityMix {
  const mix = emptySeverity()
  for (const inc of incidents) {
    if (!inStartedWindow(inc, win)) continue
    const u = classifyIncident(inc, nowMs)
    if (u === "red_alert") mix.critical += 1
    else if (u === "yellow_awaiting") mix.warning += 1
    else mix.normal += 1
  }
  return mix
}

function typeCountsForWindow(
  incidents: IncidentSummary[],
  win: TrendsPeriodWindow,
): Record<IncidentTrendBucket, number> {
  const counts: Record<IncidentTrendBucket, number> = {
    fall: 0,
    skin: 0,
    medication: 0,
    behavior: 0,
  }
  for (const inc of incidents) {
    if (!inStartedWindow(inc, win)) continue
    const b = mapIncidentTypeToTrendBucket(inc.incidentType)
    if (!b) continue
    counts[b] += 1
  }
  return counts
}

export function computeTrendsIncidentTrendsResponse(
  incidents: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsIncidentTrendsResponse {
  const curC = typeCountsForWindow(incidents, current)
  const prevC = typeCountsForWindow(incidents, previous)

  const order: IncidentTrendBucket[] = ["fall", "skin", "medication", "behavior"]
  const typeRows: TrendsIncidentTypeRow[] = []
  for (const bucket of order) {
    const c = curC[bucket]
    const p = prevC[bucket]
    if (c > 0 || p > 0) typeRows.push({ bucket, current: c, previous: p })
  }
  typeRows.sort((a, b) => b.current - a.current)

  let largestMover: TrendsIncidentTrendsResponse["largestMover"] = null
  for (const row of typeRows) {
    const d = row.current - row.previous
    const ad = Math.abs(d)
    if (largestMover == null || ad > Math.abs(largestMover.delta)) {
      largestMover = { bucket: row.bucket, delta: d, current: row.current, previous: row.previous }
    } else if (largestMover && ad === Math.abs(largestMover.delta) && row.current > largestMover.current) {
      largestMover = { bucket: row.bucket, delta: d, current: row.current, previous: row.previous }
    }
  }

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    typeRows,
    severityCurrent: severityMixForWindow(incidents, current, nowMs),
    severityPrevious: severityMixForWindow(incidents, previous, nowMs),
    largestMover,
  }
}
