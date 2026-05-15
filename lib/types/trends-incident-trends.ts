import type { TrendsRangeKey } from "@/lib/admin/trends-range"

export type IncidentTrendBucket = "fall" | "skin" | "medication" | "behavior"

export type TrendsIncidentSeverityMix = {
  critical: number
  warning: number
  normal: number
}

export type TrendsIncidentTypeRow = {
  bucket: IncidentTrendBucket
  current: number
  previous: number
}

export type TrendsIncidentTrendsResponse = {
  range: TrendsRangeKey
  generatedAt: string
  /** Only buckets with any count in current or previous window. */
  typeRows: TrendsIncidentTypeRow[]
  severityCurrent: TrendsIncidentSeverityMix
  severityPrevious: TrendsIncidentSeverityMix
  /** Largest absolute delta among mapped buckets; null if no bucket data. */
  largestMover: { bucket: IncidentTrendBucket; delta: number; current: number; previous: number } | null
}
