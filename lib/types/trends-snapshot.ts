import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsComplianceDriftResponse } from "@/lib/types/trends-compliance-drift"
import type { TrendsFacilityHealthResponse } from "@/lib/types/trends-facility-health"
import type { TrendsHighRiskCohortResponse } from "@/lib/types/trends-high-risk-cohort"
import type { TrendsIncidentTrendsResponse } from "@/lib/types/trends-incident-trends"
import type { TrendsInterventionEffectivenessResponse } from "@/lib/types/trends-intervention-effectiveness"
import type { TrendsPatternInsightsResponse } from "@/lib/types/trends-pattern-insights"
import type { TrendsStaffingThroughputResponse } from "@/lib/types/trends-staffing-throughput"
import type { TrendsWeeklyBriefResponse } from "@/lib/types/trends-weekly-brief"

export const TRENDS_SNAPSHOT_SCHEMA_VERSION = 1 as const

export type TrendsSnapshotPeriodMeta = {
  startIso: string
  endIso: string
}

/**
 * Compact Trends envelope for Executive View — one fetch powers E2–E8, S1, and optional E1 metadata.
 * See `lib/admin/build-trends-snapshot.ts` and `GET /api/admin/trends/snapshot`.
 */
export type TrendsSnapshotPayload = {
  schemaVersion: typeof TRENDS_SNAPSHOT_SCHEMA_VERSION
  facilityId: string
  range: TrendsRangeKey
  generatedAt: string
  period: {
    current: TrendsSnapshotPeriodMeta
    previous: TrendsSnapshotPeriodMeta
  }
  facilityHealth: TrendsFacilityHealthResponse
  incidentTrends: TrendsIncidentTrendsResponse
  complianceDrift: TrendsComplianceDriftResponse
  patternInsights: TrendsPatternInsightsResponse
  highRiskCohort: TrendsHighRiskCohortResponse
  interventionEffectiveness: TrendsInterventionEffectivenessResponse
  staffingThroughput: TrendsStaffingThroughputResponse
  weeklyBrief: TrendsWeeklyBriefResponse
}
