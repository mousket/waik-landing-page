import type { TrendsRangeKey } from "@/lib/admin/trends-range"

export type TrendsFacilityHealthWindowMetrics = {
  incidentCount: number
  repeatIncidentCount: number
  /** % of incidents started in the window that qualify as repeat-within-7d. */
  repeatRatePercent: number
  /** Mean documentation completeness for incidents started in the window (0–100). */
  avgDocumentationPercent: number | null
  /** Median hours from report start to Phase 1 signoff, incidents started in window with signoff present. */
  medianHoursToSignoff: number | null
  /**
   * Calendar-day mix (window length = sum). Proxy: a day is “Exposed” if any incident **started**
   * that day with injury flagged; “At risk” if any incident started that day without injury; else “Protected”.
   */
  protectionDays: { protected: number; atRisk: number; exposed: number }
}

export type TrendsFacilityHealthResponse = {
  range: TrendsRangeKey
  generatedAt: string
  current: TrendsFacilityHealthWindowMetrics
  previous: TrendsFacilityHealthWindowMetrics
}
