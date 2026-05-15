import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"

export type InterventionSnapshotMetrics = {
  incidentCount: number
  repeatCount: number
  avgDocumentationPercent: number | null
}

export type TrendsInterventionEffectivenessItem = {
  id: string
  label: string
  scopeLine: string
  before: InterventionSnapshotMetrics
  after: InterventionSnapshotMetrics
  beforePeriodLabel: string
  afterPeriodLabel: string
  evidencePathBefore: string
  evidencePathAfter: string
  typeBucket: IncidentTrendBucket | null
  unit: string | null
}

export type TrendsInterventionEffectivenessResponse = {
  range: TrendsRangeKey
  generatedAt: string
  /** Max 3 directional comparison lenses (not causal claims). */
  items: TrendsInterventionEffectivenessItem[]
}
