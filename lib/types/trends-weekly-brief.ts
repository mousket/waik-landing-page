import type { TrendsRangeKey } from "@/lib/admin/trends-range"

export type TrendsWeeklyBriefSectionId =
  | "what_changed"
  | "risk_direction"
  | "bottleneck"
  | "recommendations"

export type TrendsWeeklyBriefBullet = {
  /** Sentence with at least one quantitative evidence point. */
  text: string
  /**
   * Path + query for drilldown (`/admin/incidents?…`, `/admin/residents?…`).
   * Client wraps with `buildAdminPathWithContext`.
   */
  evidencePath: string
}

export type TrendsWeeklyBriefSection = {
  id: TrendsWeeklyBriefSectionId
  title: string
  bullets: TrendsWeeklyBriefBullet[]
}

export type TrendsWeeklyBriefResponse = {
  range: TrendsRangeKey
  generatedAt: string
  sections: TrendsWeeklyBriefSection[]
}
