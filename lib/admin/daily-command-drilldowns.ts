import { buildAdminPathWithContext } from "@/lib/admin-nav-context"

/**
 * Stable query keys for Daily Command drilldowns (see `drilldowns-map.md`).
 * Values are the literal strings emitted on `/admin/incidents` URLs.
 */
export const DailyCommandIncidentsQuery = {
  rangeToday: "today",
  attention: "1",
  repeat: "1",
  severityCritical: "critical",
  bottleneckOverdueDocs: "overdue_docs",
  bottleneckMissingInfo: "missing_info",
  bottleneckAwaitingFollowup: "awaiting_followup",
  bottleneckReadyForSignoff: "ready_for_signoff",
  bottleneckMissingAssignment: "missing_assignment",
} as const

function mergeIncidentsPath(baseQuery: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(baseQuery)) {
    if (v) q.set(k, v)
  }
  const s = q.toString()
  return s ? `/admin/incidents?${s}` : "/admin/incidents"
}

/** Filtered incidents list; preserves `facilityId` / `organizationId` via `searchParams`. */
export function dailyCommandIncidentsListHref(
  searchParams: URLSearchParams,
  filters: {
    range?: string
    severity?: string
    bottleneck?: string
    attention?: string
    type?: string
    unit?: string
    repeat?: string
  },
): string {
  return buildAdminPathWithContext(
    mergeIncidentsPath({
      range: filters.range,
      severity: filters.severity,
      bottleneck: filters.bottleneck,
      attention: filters.attention,
      type: filters.type,
      unit: filters.unit,
      repeat: filters.repeat,
    }),
    searchParams,
  )
}

export function dailyCommandAttentionQueueHref(searchParams: URLSearchParams): string {
  return dailyCommandIncidentsListHref(searchParams, {
    range: DailyCommandIncidentsQuery.rangeToday,
    attention: DailyCommandIncidentsQuery.attention,
  })
}
