import type { TrendsPeriodWindow, TrendsRangeKey } from "@/lib/admin/trends-range"
import { computeTrendsComplianceDriftResponse } from "@/lib/admin/trends-compliance-drift-metrics"
import { computeTrendsFacilityHealthPair } from "@/lib/admin/trends-facility-health-metrics"
import { computeTrendsHighRiskCohortResponse } from "@/lib/admin/trends-high-risk-cohort-metrics"
import { computeTrendsIncidentTrendsResponse } from "@/lib/admin/trends-incident-trends-metrics"
import { trendBucketLabel } from "@/lib/admin/trends-incident-type-buckets"
import { computeTrendsPatternInsightsResponse } from "@/lib/admin/trends-pattern-insights-metrics"
import { computeTrendsStaffingThroughputResponse } from "@/lib/admin/trends-staffing-throughput-metrics"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import type { RiskDriverKey } from "@/lib/types/trends-high-risk-cohort"
import type {
  TrendsWeeklyBriefBullet,
  TrendsWeeklyBriefResponse,
  TrendsWeeklyBriefSection,
} from "@/lib/types/trends-weekly-brief"

function rangeDaysLabel(range: TrendsRangeKey): string {
  if (range === "7d") return "7 days"
  if (range === "30d") return "30 days"
  return "90 days"
}

function incidentsRangePath(range: TrendsRangeKey): string {
  return `/admin/incidents?range=${range}`
}

function incidentsTypePath(range: TrendsRangeKey, type: string): string {
  return `/admin/incidents?range=${range}&type=${encodeURIComponent(type)}`
}

function residentsHighRiskPath(range: TrendsRangeKey, driver?: RiskDriverKey): string {
  const base = `/admin/residents?range=${range}&risk=high`
  return driver ? `${base}&driver=${encodeURIComponent(driver)}` : base
}

function pushBullet(bullets: TrendsWeeklyBriefBullet[], text: string, evidencePath: string, max: number) {
  if (bullets.length >= max) return
  bullets.push({ text, evidencePath })
}

function section(
  id: TrendsWeeklyBriefSection["id"],
  title: string,
  bullets: TrendsWeeklyBriefBullet[],
  fallback: TrendsWeeklyBriefBullet,
): TrendsWeeklyBriefSection {
  return {
    id,
    title,
    bullets: bullets.length ? bullets : [fallback],
  }
}

export function computeTrendsWeeklyBriefResponse(
  pool: IncidentSummary[],
  current: TrendsPeriodWindow,
  previous: TrendsPeriodWindow,
  range: TrendsRangeKey,
  nowMs: number,
): TrendsWeeklyBriefResponse {
  const health = computeTrendsFacilityHealthPair(pool, current, previous)
  const incidentTrends = computeTrendsIncidentTrendsResponse(pool, current, previous, range, nowMs)
  const compliance = computeTrendsComplianceDriftResponse(pool, current, previous, range, nowMs)
  const pattern = computeTrendsPatternInsightsResponse(pool, current, range, nowMs)
  const cohort = computeTrendsHighRiskCohortResponse(pool, current, previous, range, nowMs)
  const staffing = computeTrendsStaffingThroughputResponse(pool, current, previous, range, nowMs)

  const periodLabel = rangeDaysLabel(range)
  const listPath = incidentsRangePath(range)

  const whatChanged: TrendsWeeklyBriefBullet[] = []
  const incDelta = health.current.incidentCount - health.previous.incidentCount
  pushBullet(
    whatChanged,
    `${health.current.incidentCount} incident reports started in the last ${periodLabel} (${incDelta >= 0 ? "+" : ""}${incDelta} vs the previous period).`,
    listPath,
    4,
  )

  const mover = incidentTrends.largestMover
  if (mover && Math.abs(mover.delta) > 0) {
    const label = trendBucketLabel(mover.bucket)
    pushBullet(
      whatChanged,
      `${label} moved the most: ${mover.current} this period vs ${mover.previous} before (${mover.delta >= 0 ? "+" : ""}${mover.delta}).`,
      incidentsTypePath(range, mover.bucket),
      4,
    )
  }

  const topInsight = pattern.insights[0]
  if (topInsight) {
    pushBullet(whatChanged, topInsight.evidenceLine, topInsight.evidencePath, 4)
  }

  const curDoc = health.current.avgDocumentationPercent
  const prevDoc = health.previous.avgDocumentationPercent
  if (curDoc != null && prevDoc != null) {
    const docDelta = curDoc - prevDoc
    if (Math.abs(docDelta) >= 1) {
      pushBullet(
        whatChanged,
        `Documentation completion averaged ${curDoc}% (${docDelta >= 0 ? "+" : ""}${docDelta} pts vs the previous period).`,
        listPath,
        4,
      )
    }
  }

  const riskDirection: TrendsWeeklyBriefBullet[] = []
  const cohortDelta = cohort.cohortCountCurrent - cohort.cohortCountPrevious
  if (cohort.cohortCountCurrent > 0 || cohort.cohortCountPrevious > 0) {
    const trendWord = cohortDelta > 0 ? "rising" : cohortDelta < 0 ? "falling" : "stable"
    pushBullet(
      riskDirection,
      `High-risk cohort is ${trendWord}: ${cohort.cohortCountCurrent} residents flagged now vs ${cohort.cohortCountPrevious} in the prior period (${cohortDelta >= 0 ? "+" : ""}${cohortDelta}).`,
      residentsHighRiskPath(range),
      3,
    )
  }
  if (cohort.newlyFlaggedCount > 0) {
    pushBullet(
      riskDirection,
      `${cohort.newlyFlaggedCount} resident${cohort.newlyFlaggedCount === 1 ? "" : "s"} newly flagged as high-risk this period.`,
      residentsHighRiskPath(range),
      3,
    )
  }
  const topDriver = cohort.driverRows.find((d) => d.deltaVsPrevious !== 0) ?? cohort.driverRows[0]
  if (topDriver && topDriver.residentCount > 0) {
    pushBullet(
      riskDirection,
      `Leading driver: ${topDriver.label} among ${topDriver.residentCount} residents (${topDriver.deltaVsPrevious >= 0 ? "+" : ""}${topDriver.deltaVsPrevious} vs prior).`,
      residentsHighRiskPath(range, topDriver.key),
      3,
    )
  }
  const critDelta = incidentTrends.severityCurrent.critical - incidentTrends.severityPrevious.critical
  if (incidentTrends.severityCurrent.critical > 0 || critDelta !== 0) {
    pushBullet(
      riskDirection,
      `${incidentTrends.severityCurrent.critical} critical-severity reports this period (${critDelta >= 0 ? "+" : ""}${critDelta} vs prior).`,
      `/admin/incidents?range=${range}&severity=critical`,
      3,
    )
  }

  const bottleneck: TrendsWeeklyBriefBullet[] = []
  const topBn = staffing.bottleneckRows[0]
  if (topBn) {
    pushBullet(
      bottleneck,
      `Top throughput bottleneck: ${topBn.count} open reports cite “${topBn.label}” (${topBn.deltaVsPrevious >= 0 ? "+" : ""}${topBn.deltaVsPrevious} vs prior).`,
      `/admin/incidents?range=${range}&bottleneck=${topBn.key}`,
      2,
    )
  }
  const overdueDelta = staffing.currentOverdueCount - staffing.previousOverdueCount
  if (staffing.currentOverdueCount > 0 || overdueDelta !== 0) {
    pushBullet(
      bottleneck,
      `${staffing.currentOverdueCount} reports are overdue on documentation or follow-up (${overdueDelta >= 0 ? "+" : ""}${overdueDelta} vs prior).`,
      `/admin/incidents?range=${range}&bottleneck=overdue_docs`,
      2,
    )
  }

  const recommendations: TrendsWeeklyBriefBullet[] = []
  const slip = compliance.biggestSlip
  if (slip) {
    const path =
      slip.kind === "unit"
        ? `/admin/incidents?range=${range}&unit=${encodeURIComponent(slip.key)}`
        : `/admin/incidents?range=${range}&role=${encodeURIComponent(slip.key)}`
    const slice = slip.kind === "unit" ? "unit" : "reporter role"
    pushBullet(
      recommendations,
      `Review documentation completion for ${slice} “${slip.label}” (${slip.deltaPts} pts vs prior; now ${slip.currentPercent}%).`,
      path,
      3,
    )
  }
  const strain =
    staffing.unitStrainRows.find((u) => u.deltaStrainVsPrevious > 0) ?? staffing.unitStrainRows[0]
  if (strain) {
    pushBullet(
      recommendations,
      `Unit ${strain.unit} shows ${strain.strain} high-strain signals across ${strain.open} open reports — worth a focused operational review.`,
      `/admin/incidents?range=${range}&unit=${encodeURIComponent(strain.unit)}`,
      3,
    )
  }
  const repeatDelta = health.current.repeatRatePercent - health.previous.repeatRatePercent
  if (health.current.repeatIncidentCount > 0 && repeatDelta > 0) {
    pushBullet(
      recommendations,
      `Repeat incidents within 7 days: ${health.current.repeatIncidentCount} of ${health.current.incidentCount} (${health.current.repeatRatePercent}%, up ${repeatDelta} pts).`,
      `/admin/incidents?range=${range}&repeat=1`,
      3,
    )
  }
  if (!recommendations.length && pattern.insights[1]) {
    const alt = pattern.insights[1]
    pushBullet(recommendations, alt.whyLine, alt.evidencePath, 3)
  }

  const sections: TrendsWeeklyBriefSection[] = [
    section("what_changed", "What changed", whatChanged, {
      text: `No incident activity in the last ${periodLabel} — confirm the pipeline in your incident list.`,
      evidencePath: listPath,
    }),
    section("risk_direction", "Where risk is rising or falling", riskDirection, {
      text: `No high-risk cohort movement detected in the last ${periodLabel} — review residents flagged in prior periods.`,
      evidencePath: residentsHighRiskPath(range),
    }),
    section("bottleneck", "Biggest bottleneck", bottleneck, {
      text: `No throughput bottlenecks surfaced in the last ${periodLabel} — open reports to confirm backlog.`,
      evidencePath: listPath,
    }),
    section("recommendations", "Recommendations", recommendations, {
      text: `Scan pattern insights and compliance cards for the last ${periodLabel} before your next leadership huddle.`,
      evidencePath: listPath,
    }),
  ]

  return {
    range,
    generatedAt: new Date(nowMs).toISOString(),
    sections,
  }
}
