import type { TrendsRangeKey } from "@/lib/admin/trends-range"

/** Stable drilldown keys for `/admin/incidents?bottleneck=…`. */
export type ThroughputBottleneckKey =
  | "missing_info"
  | "awaiting_followup"
  | "missing_assignment"
  | "regulatory_clock"

export const THROUGHPUT_BOTTLENECK_LABEL: Record<ThroughputBottleneckKey, string> = {
  missing_info: "Missing required intake fields",
  awaiting_followup: "Awaiting follow-up (IDT)",
  missing_assignment: "Phase 2 assignment gap",
  regulatory_clock: "Phase 2 clock past 48h",
}

export type TrendsStaffingBacklogPoint = {
  label: string
  startIso: string
  overdueCount: number
}

export type TrendsStaffingBottleneckRow = {
  key: ThroughputBottleneckKey
  label: string
  count: number
  deltaVsPrevious: number
}

export type TrendsStaffingUnitStrainRow = {
  unit: string
  strain: number
  open: number
  deltaStrainVsPrevious: number
}

export type TrendsStaffingThroughputResponse = {
  range: TrendsRangeKey
  generatedAt: string
  backlogTrend: TrendsStaffingBacklogPoint[]
  currentOverdueCount: number
  previousOverdueCount: number
  bottleneckRows: TrendsStaffingBottleneckRow[]
  unitStrainRows: TrendsStaffingUnitStrainRow[]
}
