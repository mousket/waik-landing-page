import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import {
  hoursOpenLabel,
  incidentHasOverdueIdt,
  isReadyForSignoff,
} from "@/lib/admin/incident-attention-helpers"
import { classifyIncident } from "@/lib/utils/incident-classification"
import type { IncidentSummary } from "@/lib/types/incident-summary"

export type DailyCommandRankedRiskRow = {
  incident: IncidentSummary
  tier: 0 | 1
  what: string
  whyNow: string
  owner: string
  ctaLabel: string
  ctaHref: string
}

export function dailyCommandRiskOwnerLabel(inc: IncidentSummary): string {
  const inv = inc.investigatorName?.trim()
  if (inv) return inv
  if (inc.phase === "phase_1_in_progress") {
    const r = inc.reportedByName?.trim()
    if (r) return r
  }
  return "Unassigned"
}

/**
 * Rank incidents for A2 “Highest risk right now” (same ordering rules as the hero card).
 */
export function rankDailyCommandHighestRisk(
  incidents: IncidentSummary[],
  searchParams: URLSearchParams,
  canAccessPhase2: boolean,
  nowMs: number,
): DailyCommandRankedRiskRow[] {
  const candidates: {
    incident: IncidentSummary
    tier: 0 | 1
    startedMs: number
    hasInjury: boolean
  }[] = []

  for (const inc of incidents) {
    const overdueIdt = incidentHasOverdueIdt(inc, nowMs)
    const u = classifyIncident(inc, nowMs)
    if (u === "none" && !overdueIdt) continue

    const tier: 0 | 1 = u === "red_alert" || overdueIdt ? 0 : 1
    const startedMs = new Date(inc.startedAt).getTime()
    candidates.push({ incident: inc, tier, startedMs, hasInjury: inc.hasInjury })
  }

  candidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.startedMs !== b.startedMs) return a.startedMs - b.startedMs
    if (a.hasInjury !== b.hasInjury) return a.hasInjury ? -1 : 1
    return 0
  })

  const rows: DailyCommandRankedRiskRow[] = []
  for (const c of candidates) {
    const inc = c.incident
    const overdueIdt = incidentHasOverdueIdt(inc, nowMs)
    const u = classifyIncident(inc, nowMs)
    const h = hoursOpenLabel(inc.startedAt, nowMs)

    let what: string
    if (u === "red_alert" && inc.hasInjury) {
      what = "Injury-flagged incident open"
    } else if (u === "red_alert") {
      what = "Phase 1 open past target window"
    } else if (overdueIdt) {
      what = "IDT follow-up overdue"
    } else {
      what = "Investigation ready to claim"
    }

    const parts: string[] = [h]
    if (inc.hasInjury) parts.push("injury documented")
    if (overdueIdt) parts.push("IDT past 24h response window")
    if (u === "yellow_awaiting" && !overdueIdt) parts.push("Phase 1 complete — awaiting pickup")
    const whyNow = parts.filter(Boolean).join(" · ")

    const owner = dailyCommandRiskOwnerLabel(inc)
    const detail = buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)
    const signoff = buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}/signoff`, searchParams)

    let ctaLabel: string
    let ctaHref: string
    if (isReadyForSignoff(inc) && canAccessPhase2) {
      ctaLabel = "Sign off"
      ctaHref = signoff
    } else if (inc.phase === "phase_1_complete" && canAccessPhase2) {
      ctaLabel = "Claim"
      ctaHref = detail
    } else {
      ctaLabel = "Open"
      ctaHref = detail
    }

    rows.push({
      incident: inc,
      tier: c.tier,
      what,
      whyNow,
      owner,
      ctaLabel,
      ctaHref,
    })
  }

  return rows
}
