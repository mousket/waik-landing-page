import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { ThroughputBottleneckKey } from "@/lib/types/trends-staffing-throughput"
import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"
import type { RiskDriverKey } from "@/lib/types/trends-high-risk-cohort"

/**
 * Stable query keys for Trends drilldowns (see `documentation/pilot_1_plan/phase_5c_2/drilldowns-map.md`).
 */
export const TrendsIncidentsQuery = {
  severityCritical: "critical",
  severityWarning: "warning",
  repeat: "1",
  bottleneckOverdueDocs: "overdue_docs",
} as const

function mergeIncidentsPath(baseQuery: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(baseQuery)) {
    if (v) q.set(k, v)
  }
  const s = q.toString()
  return s ? `/admin/incidents?${s}` : "/admin/incidents"
}

export function trendsIncidentsListHref(
  searchParams: URLSearchParams,
  range: TrendsRangeKey,
  filters: {
    type?: IncidentTrendBucket | string
    severity?: "critical" | "warning" | "normal"
    repeat?: boolean
    unit?: string
    role?: string
    phase?: string
    bottleneck?: ThroughputBottleneckKey | "overdue_docs"
  } = {},
): string {
  return buildAdminPathWithContext(
    mergeIncidentsPath({
      range,
      type: filters.type,
      severity: filters.severity,
      repeat: filters.repeat ? TrendsIncidentsQuery.repeat : undefined,
      unit: filters.unit,
      role: filters.role,
      phase: filters.phase,
      bottleneck: filters.bottleneck,
    }),
    searchParams,
  )
}

export function trendsResidentsHighRiskHref(
  searchParams: URLSearchParams,
  range: TrendsRangeKey,
  driver?: RiskDriverKey,
): string {
  const q = new URLSearchParams({ range, risk: "high" })
  if (driver) q.set("driver", driver)
  return buildAdminPathWithContext(`/admin/residents?${q.toString()}`, searchParams)
}

export function trendsDashboardModuleHref(
  searchParams: URLSearchParams,
  elementId: string,
): string {
  return `${buildAdminPathWithContext("/admin/dashboard?view=trends", searchParams)}#${elementId}`
}
