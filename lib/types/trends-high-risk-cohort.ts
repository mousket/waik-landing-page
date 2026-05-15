import type { TrendsRangeKey } from "@/lib/admin/trends-range"

/** Stable drilldown keys (aligned with Daily Command driver language). */
export type RiskDriverKey =
  | "injury"
  | "repeat_falls"
  | "repeat_pattern"
  | "multi_open"
  | "doc_pressure"
  | "thin_intake"
  | "phase_2_active"
  | "needs_triage"

export const RISK_DRIVER_LABEL: Record<RiskDriverKey, string> = {
  injury: "Injury on file",
  repeat_falls: "Repeat falls",
  repeat_pattern: "Repeat similar events",
  multi_open: "Multiple open items",
  doc_pressure: "Documentation pressure",
  thin_intake: "Thin intake",
  phase_2_active: "Phase 2 active",
  needs_triage: "Needs triage",
}

export type TrendsHighRiskCohortTimeseriesPoint = {
  label: string
  startIso: string
  /** Unique high-risk residents with ≥1 incident start in this bucket. */
  residentCount: number
}

export type TrendsHighRiskDriverRow = {
  key: RiskDriverKey
  label: string
  /** Residents in cohort with this driver among their top signals. */
  residentCount: number
  /** Change in resident count vs previous period (not percentage points). */
  deltaVsPrevious: number
}

export type TrendsHighRiskCohortResponse = {
  range: TrendsRangeKey
  generatedAt: string
  cohortCountCurrent: number
  cohortCountPrevious: number
  newlyFlaggedCount: number
  cohortTrend: TrendsHighRiskCohortTimeseriesPoint[]
  driverRows: TrendsHighRiskDriverRow[]
}
