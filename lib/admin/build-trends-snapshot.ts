import { computeTrendsComplianceDriftResponse } from "@/lib/admin/trends-compliance-drift-metrics"
import { computeTrendsFacilityHealthPair } from "@/lib/admin/trends-facility-health-metrics"
import { computeTrendsHighRiskCohortResponse } from "@/lib/admin/trends-high-risk-cohort-metrics"
import { computeTrendsIncidentTrendsResponse } from "@/lib/admin/trends-incident-trends-metrics"
import { computeTrendsInterventionEffectivenessResponse } from "@/lib/admin/trends-intervention-effectiveness-metrics"
import { computeTrendsPatternInsightsResponse } from "@/lib/admin/trends-pattern-insights-metrics"
import { computeTrendsStaffingThroughputResponse } from "@/lib/admin/trends-staffing-throughput-metrics"
import { computeTrendsWeeklyBriefResponse } from "@/lib/admin/trends-weekly-brief-metrics"
import type { TrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import type { TrendsFacilityHealthResponse } from "@/lib/types/trends-facility-health"
import type { TrendsSnapshotPayload } from "@/lib/types/trends-snapshot"

export function buildTrendsSnapshotPayload(
  facilityId: string,
  pool: TrendsIncidentPool,
  generatedAt?: string,
): TrendsSnapshotPayload {
  const { incidents, current, previous, range, nowMs } = pool
  const at = generatedAt ?? new Date(nowMs).toISOString()

  const { current: healthCurrent, previous: healthPrevious } = computeTrendsFacilityHealthPair(
    incidents,
    current,
    previous,
  )

  const facilityHealth: TrendsFacilityHealthResponse = {
    range,
    generatedAt: at,
    current: healthCurrent,
    previous: healthPrevious,
  }

  return {
    schemaVersion: 1,
    facilityId,
    range,
    generatedAt: at,
    period: {
      current: { startIso: current.start.toISOString(), endIso: current.end.toISOString() },
      previous: { startIso: previous.start.toISOString(), endIso: previous.end.toISOString() },
    },
    facilityHealth,
    incidentTrends: computeTrendsIncidentTrendsResponse(incidents, current, previous, range, nowMs),
    complianceDrift: computeTrendsComplianceDriftResponse(incidents, current, previous, range, nowMs),
    patternInsights: computeTrendsPatternInsightsResponse(incidents, current, range, nowMs),
    highRiskCohort: computeTrendsHighRiskCohortResponse(incidents, current, previous, range, nowMs),
    interventionEffectiveness: computeTrendsInterventionEffectivenessResponse(
      incidents,
      current,
      previous,
      range,
      nowMs,
    ),
    staffingThroughput: computeTrendsStaffingThroughputResponse(incidents, current, previous, range, nowMs),
    weeklyBrief: computeTrendsWeeklyBriefResponse(incidents, current, previous, range, nowMs),
  }
}
