import type { TrendsRangeKey } from "@/lib/admin/trends-range"

export type TrendsPatternInsightKind =
  | "time_cluster"
  | "unit_cluster"
  | "repeat_cluster"
  | "documentation_cluster"

export type TrendsPatternInsight = {
  kind: TrendsPatternInsightKind
  title: string
  evidenceLine: string
  /** Unit/wing or time window label when it narrows the story. */
  whereLine: string | null
  /** One line, observational (no causal claims). */
  whyLine: string
  /**
   * Path + query for `/admin/incidents` (Trends drilldown vocabulary).
   * Client wraps with `buildAdminPathWithContext`.
   */
  evidencePath: string
}

export type TrendsPatternInsightsResponse = {
  range: TrendsRangeKey
  generatedAt: string
  /** At most three insights, strongest signal first. */
  insights: TrendsPatternInsight[]
}
