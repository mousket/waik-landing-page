import { buildDailyCommandHighRiskResidents } from "@/lib/admin/daily-command-high-risk-residents"
import {
  rankDailyCommandHighestRisk,
  type DailyCommandRankedRiskRow,
} from "@/lib/admin/daily-command-highest-risk"
import { buildDailyCommandNeedsAttentionSlice } from "@/lib/admin/daily-command-needs-attention-preview"
import { computeDailyCommandSnapshotHeader } from "@/lib/admin/daily-command-snapshot-header"
import { buildDailyCommandStaffThroughputSlice } from "@/lib/admin/daily-command-staff-throughput"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { DailyCommandHighestRiskItem, DailyCommandTodayPayload } from "@/lib/types/daily-command-today"
import type { IncidentSummary } from "@/lib/types/incident-summary"

function mapHighestRiskRow(row: DailyCommandRankedRiskRow): DailyCommandHighestRiskItem {
  const inc = row.incident
  return {
    incidentId: inc.id,
    tier: row.tier,
    headline: row.what,
    whyNow: row.whyNow,
    owner: row.owner,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    residentName: inc.residentName?.trim() || undefined,
    residentRoom: inc.residentRoom?.trim() || undefined,
    incidentType: inc.incidentType,
  }
}

/**
 * Builds the compact Daily Command “Today” envelope used by `GET /api/admin/daily-command/today`
 * and (optionally) the admin dashboard shell.
 */
export function buildDailyCommandTodayPayload(args: {
  facilityId: string
  incidents: IncidentSummary[]
  stats: DashboardStats | null
  statsLoading: boolean
  canAccessPhase2: boolean
  searchParams: URLSearchParams
  generatedAt?: string
}): DailyCommandTodayPayload {
  const nowMs = Date.now()
  const generatedAt = args.generatedAt ?? new Date(nowMs).toISOString()
  const snapshot = computeDailyCommandSnapshotHeader(args.incidents, args.stats, args.statsLoading, nowMs)
  const ranked = rankDailyCommandHighestRisk(
    args.incidents,
    args.searchParams,
    args.canAccessPhase2,
    nowMs,
  )
  const needsAttention = buildDailyCommandNeedsAttentionSlice(
    args.incidents,
    args.searchParams,
    args.canAccessPhase2,
    nowMs,
  )
  const highRiskRaw = buildDailyCommandHighRiskResidents(args.incidents, args.searchParams, nowMs)
  highRiskRaw.sort((a, b) => b.sortScore - a.sortScore)
  const highRiskResidents = highRiskRaw.slice(0, 5)
  const staffThroughput = buildDailyCommandStaffThroughputSlice(args.incidents, nowMs)

  return {
    schemaVersion: 1,
    generatedAt,
    facilityId: args.facilityId,
    snapshot,
    highestRisk: ranked.slice(0, 3).map(mapHighestRiskRow),
    highestRiskTotal: ranked.length,
    needsAttention,
    highRiskResidents,
    staffThroughput,
  }
}
