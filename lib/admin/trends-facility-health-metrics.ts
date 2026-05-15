import { eachDayOfInterval, isSameDay, startOfDay } from "date-fns"
import type { TrendsPeriodWindow } from "@/lib/admin/trends-range"
import type { TrendsFacilityHealthWindowMetrics } from "@/lib/types/trends-facility-health"
import type { IncidentSummary } from "@/lib/types/incident-summary"

function sameResident(a: IncidentSummary, b: IncidentSummary): boolean {
  const ridA = (a.residentId || "").trim()
  const ridB = (b.residentId || "").trim()
  if (ridA && ridB && ridA === ridB) return true
  const n = (a.residentName || "").trim() === (b.residentName || "").trim()
  const r = (a.residentRoom || "").trim() === (b.residentRoom || "").trim()
  return n && r && Boolean((a.residentName || "").trim())
}

export function isRepeatWithin7Days(inc: IncidentSummary, pool: IncidentSummary[]): boolean {
  const start = new Date(inc.startedAt).getTime()
  if (Number.isNaN(start)) return false
  const windowStart = start - 7 * 24 * 60 * 60 * 1000
  return pool.some((o) => {
    if (o.id === inc.id) return false
    if (!sameResident(o, inc)) return false
    const t = new Date(o.startedAt).getTime()
    return !Number.isNaN(t) && t >= windowStart && t < start
  })
}

function startedAtMs(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? NaN : t
}

function inStartedWindow(inc: IncidentSummary, win: TrendsPeriodWindow): boolean {
  const t = startedAtMs(inc.startedAt)
  if (Number.isNaN(t)) return false
  return t >= win.start.getTime() && t <= win.end.getTime()
}

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

function completenessFor(inc: IncidentSummary): number | null {
  if (inc.completenessScore == null && inc.completenessAtSignoff == null) return null
  return Math.min(100, Math.max(0, Math.round(Number(inc.completenessScore ?? inc.completenessAtSignoff ?? 0))))
}

function hoursToSignoff(inc: IncidentSummary): number | null {
  if (!inc.phase1SignedAt) return null
  const a = startedAtMs(inc.startedAt)
  const b = startedAtMs(inc.phase1SignedAt)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null
  return (b - a) / (60 * 60 * 1000)
}

function incidentsStartingOnCalendarDay(pool: IncidentSummary[], day: Date): IncidentSummary[] {
  return pool.filter((i) => isSameDay(new Date(i.startedAt), day))
}

function protectionDaysProxy(pool: IncidentSummary[], win: TrendsPeriodWindow): {
  protected: number
  atRisk: number
  exposed: number
} {
  const days = eachDayOfInterval({ start: startOfDay(win.start), end: startOfDay(win.end) })
  let protectedN = 0
  let atRisk = 0
  let exposed = 0
  for (const d of days) {
    const startedHere = incidentsStartingOnCalendarDay(pool, d)
    if (startedHere.some((i) => i.hasInjury)) exposed += 1
    else if (startedHere.length > 0) atRisk += 1
    else protectedN += 1
  }
  return { protected: protectedN, atRisk, exposed }
}

export function computeTrendsFacilityHealthWindow(
  pool: IncidentSummary[],
  win: TrendsPeriodWindow,
): TrendsFacilityHealthWindowMetrics {
  const inWindow = pool.filter((i) => inStartedWindow(i, win))
  const n = inWindow.length
  let repeats = 0
  for (const inc of inWindow) {
    if (isRepeatWithin7Days(inc, pool)) repeats += 1
  }

  const docVals = inWindow.map(completenessFor).filter((x): x is number => x != null)
  const avgDocumentationPercent = docVals.length ? Math.round(docVals.reduce((a, b) => a + b, 0) / docVals.length) : null

  const signHrs = inWindow.map(hoursToSignoff).filter((x): x is number => x != null && x >= 0)
  const medianHoursToSignoff = signHrs.length ? Math.round((median(signHrs) ?? 0) * 10) / 10 : null

  const protectionDays = protectionDaysProxy(pool, win)

  return {
    incidentCount: n,
    repeatIncidentCount: repeats,
    repeatRatePercent: n > 0 ? Math.round((repeats / n) * 1000) / 10 : 0,
    avgDocumentationPercent,
    medianHoursToSignoff,
    protectionDays,
  }
}

export function computeTrendsFacilityHealthPair(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
): { current: TrendsFacilityHealthWindowMetrics; previous: TrendsFacilityHealthWindowMetrics } {
  return {
    current: computeTrendsFacilityHealthWindow(pool, current),
    previous: computeTrendsFacilityHealthWindow(pool, previous),
  }
}
