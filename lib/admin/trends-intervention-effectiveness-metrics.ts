import { format } from "date-fns"
import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import { isRepeatWithin7Days } from "@/lib/admin/trends-facility-health-metrics"
import { mapIncidentTypeToTrendBucket, trendBucketLabel } from "@/lib/admin/trends-incident-type-buckets"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"
import type {
  InterventionSnapshotMetrics,
  TrendsInterventionEffectivenessItem,
  TrendsInterventionEffectivenessResponse,
} from "@/lib/types/trends-intervention-effectiveness"

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

function evidencePath(
  win: TrendsPeriodWindow,
  opts: { typeBucket?: IncidentTrendBucket | null; unit?: string | null; repeatOnly?: boolean },
): string {
  const from = format(win.start, "yyyy-MM-dd")
  const to = format(win.end, "yyyy-MM-dd")
  const p = new URLSearchParams({ from, to })
  if (opts.typeBucket) p.set("type", opts.typeBucket)
  if (opts.unit) p.set("unit", opts.unit)
  if (opts.repeatOnly) p.set("repeat", "1")
  return `/admin/incidents?${p.toString()}`
}

function periodLabel(win: TrendsPeriodWindow): string {
  return `${format(win.start, "MMM d")}–${format(win.end, "MMM d, yyyy")}`
}

function completenessFor(inc: IncidentSummary): number | null {
  if (inc.completenessScore == null && inc.completenessAtSignoff == null) return null
  return Math.min(100, Math.max(0, Math.round(Number(inc.completenessScore ?? inc.completenessAtSignoff ?? 0))))
}

function snapshotForFilter(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
  filter: { typeBucket: IncidentTrendBucket | null; unit: string | null; repeatOnly?: boolean },
): InterventionSnapshotMetrics {
  let list = pool.filter((i) => inStartedWindow(i, win))
  if (filter.typeBucket) {
    list = list.filter((i) => mapIncidentTypeToTrendBucket(i.incidentType) === filter.typeBucket)
  }
  if (filter.unit) {
    list = list.filter((i) => unitKeyFromRoom(i.residentRoom || "") === filter.unit)
  }
  if (filter.repeatOnly) {
    list = list.filter((inc) => isRepeatWithin7Days(inc, pool))
  }
  let repeatCount = 0
  for (const inc of list) {
    if (isRepeatWithin7Days(inc, pool)) repeatCount += 1
  }
  const docVals = list.map(completenessFor).filter((x): x is number => x != null)
  const avgDocumentationPercent = docVals.length
    ? Math.round(docVals.reduce((a, b) => a + b, 0) / docVals.length)
    : null
  return {
    incidentCount: list.length,
    repeatCount,
    avgDocumentationPercent,
  }
}

type Candidate = {
  id: string
  label: string
  scopeLine: string
  typeBucket: IncidentTrendBucket | null
  unit: string | null
  repeatOnly: boolean
  score: number
}

function buildItem(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  c: Candidate,
): TrendsInterventionEffectivenessItem {
  const before = snapshotForFilter(pool, previous, {
    typeBucket: c.typeBucket,
    unit: c.unit,
    repeatOnly: c.repeatOnly,
  })
  const after = snapshotForFilter(pool, current, {
    typeBucket: c.typeBucket,
    unit: c.unit,
    repeatOnly: c.repeatOnly,
  })
  return {
    id: c.id,
    label: c.label,
    scopeLine: c.scopeLine,
    before,
    after,
    beforePeriodLabel: periodLabel(previous),
    afterPeriodLabel: periodLabel(current),
    evidencePathBefore: evidencePath(previous, {
      typeBucket: c.typeBucket,
      unit: c.unit,
      repeatOnly: c.repeatOnly,
    }),
    evidencePathAfter: evidencePath(current, {
      typeBucket: c.typeBucket,
      unit: c.unit,
      repeatOnly: c.repeatOnly,
    }),
    typeBucket: c.typeBucket,
    unit: c.unit,
  }
}

function candidateScore(before: InterventionSnapshotMetrics, after: InterventionSnapshotMetrics): number {
  const dInc = Math.abs(after.incidentCount - before.incidentCount)
  const dRep = Math.abs(after.repeatCount - before.repeatCount)
  const dDoc =
    before.avgDocumentationPercent != null && after.avgDocumentationPercent != null
      ? Math.abs(after.avgDocumentationPercent - before.avgDocumentationPercent) / 10
      : 0
  return dInc * 2 + dRep * 3 + dDoc
}

export function computeTrendsInterventionEffectivenessResponse(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsInterventionEffectivenessResponse {
  const candidates: Candidate[] = []

  const units = new Set<string>()
  for (const inc of pool) {
    if (inStartedWindow(inc, current) || inStartedWindow(inc, previous)) {
      const u = unitKeyFromRoom(inc.residentRoom || "")
      if (u !== "Unknown") units.add(u)
    }
  }

  for (const unit of units) {
    for (const bucket of ["fall", "skin", "medication", "behavior"] as const) {
      const before = snapshotForFilter(pool, previous, { typeBucket: bucket, unit, repeatOnly: false })
      const after = snapshotForFilter(pool, current, { typeBucket: bucket, unit, repeatOnly: false })
      const total = before.incidentCount + after.incidentCount
      if (total < 4 || (before.incidentCount < 1 && after.incidentCount < 1)) continue
      const score = candidateScore(before, after)
      if (score < 1) continue
      candidates.push({
        id: `${bucket}-${unit}`,
        label: `Tracking ${trendBucketLabel(bucket).toLowerCase()} in ${unit}`,
        scopeLine: `${unit} · ${trendBucketLabel(bucket)} reports`,
        typeBucket: bucket,
        unit,
        repeatOnly: false,
        score,
      })
    }
  }

  for (const bucket of ["fall", "skin", "medication", "behavior"] as const) {
    const before = snapshotForFilter(pool, previous, { typeBucket: bucket, unit: null, repeatOnly: false })
    const after = snapshotForFilter(pool, current, { typeBucket: bucket, unit: null, repeatOnly: false })
    const total = before.incidentCount + after.incidentCount
    if (total < 6) continue
    const score = candidateScore(before, after)
    if (score < 2) continue
    candidates.push({
      id: `facility-${bucket}`,
      label: `Facility ${trendBucketLabel(bucket).toLowerCase()} trend`,
      scopeLine: `All units · ${trendBucketLabel(bucket)}`,
      typeBucket: bucket,
      unit: null,
      repeatOnly: false,
      score,
    })
  }

  const repBefore = snapshotForFilter(pool, previous, { typeBucket: null, unit: null, repeatOnly: true })
  const repAfter = snapshotForFilter(pool, current, { typeBucket: null, unit: null, repeatOnly: true })
  if (repBefore.incidentCount + repAfter.incidentCount >= 4) {
    const score = candidateScore(repBefore, repAfter)
    if (score >= 1) {
      candidates.push({
        id: "facility-repeat",
        label: "Repeat incidents (within 7d)",
        scopeLine: "Facility-wide · repeat-within-7d cohort",
        typeBucket: null,
        unit: null,
        repeatOnly: true,
        score: score + 2,
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const items: TrendsInterventionEffectivenessItem[] = []
  for (const c of candidates) {
    const key = `${c.typeBucket ?? "all"}|${c.unit ?? "all"}|${c.repeatOnly ? "rep" : "inc"}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push(buildItem(pool, current, previous, c))
    if (items.length >= 3) break
  }

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    items,
  }
}
