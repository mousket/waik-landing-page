import { format } from "date-fns"
import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import { isRepeatWithin7Days } from "@/lib/admin/trends-facility-health-metrics"
import { mapIncidentTypeToTrendBucket, trendBucketLabel } from "@/lib/admin/trends-incident-type-buckets"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type {
  TrendsPatternInsight,
  TrendsPatternInsightKind,
  TrendsPatternInsightsResponse,
} from "@/lib/types/trends-pattern-insights"
import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"

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

function evidenceBasePath(win: TrendsPeriodWindow): string {
  const from = format(win.start, "yyyy-MM-dd")
  const to = format(win.end, "yyyy-MM-dd")
  return `/admin/incidents?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
}

function completenessRounded(inc: IncidentSummary): number {
  return Math.min(100, Math.max(0, Math.round(Number(inc.completenessScore ?? inc.completenessAtSignoff ?? 0))))
}

type LocalDayPart = "overnight" | "morning" | "afternoon" | "evening"

const DAY_PART_LABEL: Record<LocalDayPart, string> = {
  overnight: "overnight (10pm–6am)",
  morning: "morning (6am–noon)",
  afternoon: "afternoon (noon–6pm)",
  evening: "evening (6–10pm)",
}

function localDayPart(iso: string): LocalDayPart | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const h = d.getHours()
  if (h >= 22 || h < 6) return "overnight"
  if (h < 12) return "morning"
  if (h < 18) return "afternoon"
  return "evening"
}

function tryTimeCluster(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
): TrendsPatternInsight | null {
  const inWin = pool.filter((i) => inStartedWindow(i, win))
  let bestBucket: IncidentTrendBucket | null = null
  let bestTotal = 0
  for (const b of ["fall", "skin", "medication", "behavior"] as const) {
    const typed = inWin.filter((i) => mapIncidentTypeToTrendBucket(i.incidentType) === b)
    if (typed.length > bestTotal) {
      bestTotal = typed.length
      bestBucket = b
    }
  }
  if (!bestBucket || bestTotal < 5) return null

  const typed = inWin.filter((i) => mapIncidentTypeToTrendBucket(i.incidentType) === bestBucket)
  const counts = new Map<LocalDayPart, number>()
  for (const p of ["overnight", "morning", "afternoon", "evening"] as const) counts.set(p, 0)
  for (const inc of typed) {
    const part = localDayPart(inc.startedAt)
    if (!part) continue
    counts.set(part, (counts.get(part) ?? 0) + 1)
  }
  let winPart: LocalDayPart | null = null
  let winN = 0
  for (const [p, n] of counts) {
    if (n > winN) {
      winN = n
      winPart = p
    }
  }
  if (!winPart || winN < 4) return null
  const share = winN / bestTotal
  if (share < 0.34) return null

  const label = trendBucketLabel(bestBucket)
  const path = `${evidenceBasePath(win)}&type=${bestBucket}`
  return {
    kind: "time_cluster",
    title: `${label} clustered in one part of the day`,
    evidenceLine: `${winN} of ${bestTotal} ${label.toLowerCase()} reports started during ${DAY_PART_LABEL[winPart]} (local time).`,
    whereLine: null,
    whyLine:
      "Timing clusters can correlate with handoffs or staffing patterns — worth a quick operational look, not a conclusion about cause.",
    evidencePath: path,
  }
}

function tryUnitCluster(pool: IncidentSummary[], win: TrendsPeriodWindow): TrendsPatternInsight | null {
  const inWin = pool.filter((i) => inStartedWindow(i, win))
  const n = inWin.length
  if (n < 10) return null
  const byUnit = new Map<string, number>()
  for (const inc of inWin) {
    const u = unitKeyFromRoom(inc.residentRoom || "")
    byUnit.set(u, (byUnit.get(u) ?? 0) + 1)
  }
  let bestU = ""
  let bestC = 0
  for (const [u, c] of byUnit) {
    if (u === "Unknown") continue
    if (c > bestC) {
      bestC = c
      bestU = u
    }
  }
  if (!bestU || bestC < 5) return null
  const share = Math.round((bestC / n) * 1000) / 10
  if (share < 28) return null
  const path = `${evidenceBasePath(win)}&unit=${encodeURIComponent(bestU)}`
  return {
    kind: "unit_cluster",
    title: "Incidents concentrated in one unit",
    evidenceLine: `${bestC} of ${n} reports (${share}%) started with residents on ${bestU}.`,
    whereLine: bestU,
    whyLine:
      "A concentrated unit signal often reflects routing or acuity — use the list to see whether types or phases cluster the same way.",
    evidencePath: path,
  }
}

function tryRepeatCluster(pool: IncidentSummary[], win: TrendsPeriodWindow): TrendsPatternInsight | null {
  const inWin = pool.filter((i) => inStartedWindow(i, win))
  const n = inWin.length
  if (n < 8) return null
  let rep = 0
  for (const inc of inWin) {
    if (isRepeatWithin7Days(inc, pool)) rep += 1
  }
  const rate = Math.round((rep / n) * 1000) / 10
  if (rep < 4 || rate < 20) return null
  const path = `${evidenceBasePath(win)}&repeat=1`
  return {
    kind: "repeat_cluster",
    title: "Repeat incidents are elevated this period",
    evidenceLine: `${rep} of ${n} reports (${rate}%) met repeat-within-7d criteria.`,
    whereLine: null,
    whyLine:
      "Repeats are a leading indicator of follow-up load — the filtered list is the evidence set for same-resident sequencing.",
    evidencePath: path,
  }
}

function tryDocumentationCluster(pool: IncidentSummary[], win: TrendsPeriodWindow): TrendsPatternInsight | null {
  const inWin = pool.filter((i) => inStartedWindow(i, win))
  const thin = inWin.filter((i) => i.phase === "phase_1_in_progress" && completenessRounded(i) < 50)
  const phase1 = inWin.filter((i) => i.phase === "phase_1_in_progress")
  if (thin.length < 4) return null
  const path = `${evidenceBasePath(win)}&phase=${encodeURIComponent("phase_1_in_progress")}`
  const sharePhase1 =
    phase1.length > 0 ? Math.round((thin.length / phase1.length) * 1000) / 10 : null
  const evidence =
    sharePhase1 != null && phase1.length >= 3
      ? `${thin.length} Phase 1 reports stayed under 50% completeness (${sharePhase1}% of Phase 1 in this window).`
      : `${thin.length} Phase 1 reports stayed under 50% completeness during this window.`
  return {
    kind: "documentation_cluster",
    title: "Phase 1 documentation looks thin in places",
    evidenceLine: evidence,
    whereLine: null,
    whyLine:
      "Low intake completeness tends to correlate with rework later — observational support cue, not a performance judgment.",
    evidencePath: path,
  }
}

function insightScore(i: TrendsPatternInsight): number {
  const m = i.evidenceLine.match(/(\d+)\s+of\s+(\d+)/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (b > 0) return a + (a / b) * 10
  }
  const m2 = i.evidenceLine.match(/(\d+)\s+Phase/)
  if (m2) return Number(m2[1]) * 1.2
  return 1
}

function dedupeKinds(list: TrendsPatternInsight[]): TrendsPatternInsight[] {
  const seen = new Set<TrendsPatternInsightKind>()
  const out: TrendsPatternInsight[] = []
  for (const x of list) {
    if (seen.has(x.kind)) continue
    seen.add(x.kind)
    out.push(x)
  }
  return out
}

export function computeTrendsPatternInsightsResponse(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsPatternInsightsResponse {
  const candidates: TrendsPatternInsight[] = []
  const t = tryTimeCluster(pool, current)
  if (t) candidates.push(t)
  const u = tryUnitCluster(pool, current)
  if (u) candidates.push(u)
  const r = tryRepeatCluster(pool, current)
  if (r) candidates.push(r)
  const d = tryDocumentationCluster(pool, current)
  if (d) candidates.push(d)

  const ranked = dedupeKinds([...candidates].sort((a, b) => insightScore(b) - insightScore(a))).slice(0, 3)

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    insights: ranked,
  }
}
