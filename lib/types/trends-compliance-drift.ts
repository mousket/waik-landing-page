import type { TrendsRangeKey } from "@/lib/admin/trends-range"

export type TrendsComplianceDriftTimeseriesPoint = {
  /** Short bucket label for axis (e.g. "May 1" or "Wk of May 1"). */
  label: string
  startIso: string
  avgCompletionPercent: number | null
  sampleCount: number
}

export type TrendsComplianceDriftBreakdownRow = {
  key: string
  label: string
  currentPercent: number
  previousPercent: number
  /** Current minus previous (percentage points). */
  deltaPts: number
  currentCount: number
}

export type TrendsComplianceDriftSlip = {
  kind: "unit" | "role"
  key: string
  label: string
  deltaPts: number
  currentPercent: number
  previousPercent: number
}

export type TrendsComplianceDriftResponse = {
  range: TrendsRangeKey
  generatedAt: string
  currentAvgPercent: number | null
  previousAvgPercent: number | null
  completionTrend: TrendsComplianceDriftTimeseriesPoint[]
  unitRows: TrendsComplianceDriftBreakdownRow[]
  /** Aggregated remainder when more than three units have data. */
  othersUnit: TrendsComplianceDriftBreakdownRow | null
  roleRows: TrendsComplianceDriftBreakdownRow[]
  biggestSlip: TrendsComplianceDriftSlip | null
}
