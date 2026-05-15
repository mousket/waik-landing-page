import { format } from "date-fns"
import { computeTrendsPeriodWindows, parseTrendsRangeParam } from "@/lib/admin/trends-range"
import type { ThroughputBottleneckKey } from "@/lib/types/trends-staffing-throughput"
import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"

const BOTTLENECK_KEYS = new Set<string>([
  "missing_info",
  "awaiting_followup",
  "missing_assignment",
  "regulatory_clock",
  "overdue_docs",
])

const BUCKETS = new Set<IncidentTrendBucket>(["fall", "skin", "medication", "behavior"])

export function isIncidentTrendBucket(s: string): s is IncidentTrendBucket {
  return BUCKETS.has(s.trim().toLowerCase() as IncidentTrendBucket)
}

export type ParsedAdminIncidentsUrl = {
  /** yyyy-MM-dd for date inputs */
  dateFrom: string
  dateTo: string
  trendTypeBucket: IncidentTrendBucket | null
  /** Raw type string when not a trend bucket */
  typeExact: string | null
  phaseIn: string[]
  severity: "critical" | "warning" | "normal" | null
  repeatOnly: boolean
  /** Unit/wing key derived from room (same as Trends cards). */
  unit: string | null
  /** Lowercase reporter role slug (e.g. rn, cna). */
  role: string | null
  bottleneck: ThroughputBottleneckKey | "overdue_docs" | null
}

function emptyParsed(): ParsedAdminIncidentsUrl {
  return {
    dateFrom: "",
    dateTo: "",
    trendTypeBucket: null,
    typeExact: null,
    phaseIn: [],
    severity: null,
    repeatOnly: false,
    unit: null,
    role: null,
    bottleneck: null,
  }
}

/**
 * Read drilldown query params for `/admin/incidents` (Phase 5c-2 map).
 * `range=7d|30d|90d` maps to the **current** trends window dates (local, same as Trends cards).
 */
export function parseAdminIncidentsUrl(searchParams: URLSearchParams): ParsedAdminIncidentsUrl {
  const out = emptyParsed()
  const fromQ = (searchParams.get("from") || "").trim()
  const toQ = (searchParams.get("to") || "").trim()
  const rangeRaw = (searchParams.get("range") || "").trim().toLowerCase()

  if (fromQ && toQ) {
    const a = new Date(fromQ)
    const b = new Date(toQ)
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      out.dateFrom = format(a, "yyyy-MM-dd")
      out.dateTo = format(b, "yyyy-MM-dd")
    }
  } else if (rangeRaw === "7d" || rangeRaw === "30d" || rangeRaw === "90d") {
    const range = parseTrendsRangeParam(rangeRaw)
    const { current } = computeTrendsPeriodWindows(new Date(), range)
    out.dateFrom = format(current.start, "yyyy-MM-dd")
    out.dateTo = format(current.end, "yyyy-MM-dd")
  } else if (rangeRaw === "today") {
    const now = new Date()
    out.dateFrom = format(now, "yyyy-MM-dd")
    out.dateTo = format(now, "yyyy-MM-dd")
  }

  const typeRaw = (searchParams.get("type") || "").trim().toLowerCase()
  if (typeRaw && isIncidentTrendBucket(typeRaw)) {
    out.trendTypeBucket = typeRaw as IncidentTrendBucket
  } else if (typeRaw) {
    out.typeExact = typeRaw
  }

  const phaseRaw = (searchParams.get("phase") || "").trim()
  if (phaseRaw) {
    out.phaseIn = phaseRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const sev = (searchParams.get("severity") || "").trim().toLowerCase()
  if (sev === "critical" || sev === "warning" || sev === "normal") {
    out.severity = sev
  }

  const rep = (searchParams.get("repeat") || "").trim()
  out.repeatOnly = rep === "1" || rep.toLowerCase() === "true"

  const unitQ = (searchParams.get("unit") || "").trim()
  out.unit = unitQ ? unitQ : null

  const roleQ = (searchParams.get("role") || "").trim().toLowerCase()
  out.role = roleQ ? roleQ : null

  const bn = (searchParams.get("bottleneck") || "").trim().toLowerCase()
  if (bn && BOTTLENECK_KEYS.has(bn)) {
    out.bottleneck = bn as ParsedAdminIncidentsUrl["bottleneck"]
  }

  return out
}

export function adminIncidentsUrlHasDrilldownParams(searchParams: URLSearchParams): boolean {
  return ["range", "from", "to", "type", "severity", "repeat", "phase", "unit", "role", "bottleneck"].some((k) =>
    Boolean(searchParams.get(k)?.trim()),
  )
}

/** Rolling `days` hint for GET /api/incidents (repeat needs +7 lookback). */
export function adminIncidentsFetchDaysHint(searchParams: URLSearchParams): number | undefined {
  const p = parseAdminIncidentsUrl(searchParams)
  const rangeRaw = (searchParams.get("range") || "").trim().toLowerCase()
  let days: number | undefined
  if (rangeRaw === "7d" || rangeRaw === "30d" || rangeRaw === "90d") {
    const r = parseTrendsRangeParam(rangeRaw)
    days = r === "7d" ? 7 : r === "30d" ? 30 : 90
  } else if (p.dateFrom && p.dateTo) {
    const a = new Date(`${p.dateFrom}T00:00:00`).getTime()
    const b = new Date(`${p.dateTo}T23:59:59.999`).getTime()
    if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
      days = Math.ceil((b - a) / (24 * 60 * 60 * 1000)) + 1
    }
  } else if (rangeRaw === "today") {
    days = 1
  }
  if (days == null && p.repeatOnly) {
    return 67
  }
  if (days == null) return undefined
  if (p.repeatOnly) days += 7
  return Math.min(Math.max(days, 1), 400)
}
