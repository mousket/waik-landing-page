/**
 * Daily Command “Today” aggregate payload (Phase 5c-1).
 * Canonical drilldown vocabulary: `documentation/pilot_1_plan/phase_5c_1/drilldowns-map.md`
 *
 * Intended consumers:
 * - `GET /api/admin/daily-command/today` (compact JSON for shells / future clients)
 * - `buildDailyCommandTodayPayload` in `lib/admin/build-daily-command-today.ts` (shared with UI when wired)
 */

export type DailyCommandProtectionLevel = "protected" | "at_risk" | "exposed"

/** A1 — header chips + protection (counts only; no full incident list). */
export type DailyCommandSnapshotHeader = {
  criticalOpen: number
  overdueDocs: number
  incidentsToday: number
  protection: DailyCommandProtectionLevel
  /** Count of incidents flagged as “repeat within 7 days” vs same resident cohort (open pipeline). */
  repeatsWithin7Days: number
}

/** A2 — hero row (evidence IDs + display fields + CTA metadata). */
export type DailyCommandHighestRiskItem = {
  incidentId: string
  tier: 0 | 1
  headline: string
  whyNow: string
  owner: string
  ctaLabel: string
  /** Absolute path + query (includes admin facility context when `searchParams` had scope). */
  ctaHref: string
  residentName?: string
  residentRoom?: string
  incidentType: string
}

/** A3 — needs attention preview row. */
export type DailyCommandNeedsAttentionRow = {
  incidentId: string
  group: "ready_for_signoff" | "missing_info" | "awaiting_followup"
  groupTitle: string
  ageLabel: string
  ctaLabel: string
  ctaHref: string
  incidentType: string
}

export type DailyCommandNeedsAttentionSlice = {
  totalInQueue: number
  preview: DailyCommandNeedsAttentionRow[]
}

/** A6 — resident bundle row. */
export type DailyCommandHighRiskResidentItem = {
  key: string
  residentId?: string
  name: string
  room: string
  unit: string
  drivers: string[]
  whyNow: string
  bundleHref: string
  sortScore: number
}

/** A7 — throughput outlier (unit strain, assignment gap, reporter load). */
export type DailyCommandStaffThroughputUnit = {
  unit: string
  strain: number
  open: number
}

export type DailyCommandStaffThroughputReporter = {
  name: string
  detail: string
}

export type DailyCommandStaffThroughputSlice = {
  units: DailyCommandStaffThroughputUnit[]
  unassignedPhase2: number
  thinPhase1Beyond12h: number
  reporterLoad: DailyCommandStaffThroughputReporter[]
}

/**
 * Single envelope for Daily Command “Today” cards (A1–A7 data surfaces).
 * v1: built from open-pipeline `IncidentSummary[]` + optional cached `DashboardStats`.
 */
export type DailyCommandTodayPayload = {
  schemaVersion: 1
  generatedAt: string
  facilityId: string
  snapshot: DailyCommandSnapshotHeader
  highestRisk: DailyCommandHighestRiskItem[]
  highestRiskTotal: number
  needsAttention: DailyCommandNeedsAttentionSlice
  highRiskResidents: DailyCommandHighRiskResidentItem[]
  staffThroughput: DailyCommandStaffThroughputSlice
}
