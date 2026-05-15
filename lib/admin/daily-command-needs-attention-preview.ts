import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import {
  attentionQueueGroupKey,
  hoursOpenLabel,
  incidentHasOverdueIdt,
  isInTodayAttentionQueue,
  isReadyForSignoff,
  type AttentionQueueGroupKey,
} from "@/lib/admin/incident-attention-helpers"
import { classifyIncident } from "@/lib/utils/incident-classification"
import type { DailyCommandNeedsAttentionRow, DailyCommandNeedsAttentionSlice } from "@/lib/types/daily-command-today"
import type { IncidentSummary } from "@/lib/types/incident-summary"

const MAX_PREVIEW = 8

const GROUP_ORDER: AttentionQueueGroupKey[] = ["ready_for_signoff", "missing_info", "awaiting_followup"]

const GROUP_META: Record<AttentionQueueGroupKey, { title: string; bottleneck: string }> = {
  ready_for_signoff: {
    title: "Ready for sign-off",
    bottleneck: "ready_for_signoff",
  },
  missing_info: {
    title: "Missing info",
    bottleneck: "missing_info",
  },
  awaiting_followup: {
    title: "Awaiting follow-up",
    bottleneck: "awaiting_followup",
  },
}

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function queueRowCta(
  inc: IncidentSummary,
  canAccessPhase2: boolean,
  nowMs: number,
  detailHref: string,
  signoffHref: string,
): { label: string; href: string } {
  if (isReadyForSignoff(inc) && canAccessPhase2) {
    return { label: "Sign", href: signoffHref }
  }
  if (isReadyForSignoff(inc)) {
    return { label: "Open", href: detailHref }
  }
  if (inc.phase === "phase_1_in_progress") {
    return { label: "Request info", href: detailHref }
  }
  if (incidentHasOverdueIdt(inc, nowMs)) {
    return { label: "Nudge", href: detailHref }
  }
  const u = classifyIncident(inc, nowMs)
  if (u === "yellow_awaiting" && canAccessPhase2) {
    return { label: "Assign", href: detailHref }
  }
  return { label: "Open", href: detailHref }
}

export function buildDailyCommandNeedsAttentionSlice(
  incidents: IncidentSummary[],
  searchParams: URLSearchParams,
  canAccessPhase2: boolean,
  nowMs: number,
): DailyCommandNeedsAttentionSlice {
  const pool = incidents.filter((inc) => isInTodayAttentionQueue(inc, nowMs))
  const byGroup: Record<AttentionQueueGroupKey, IncidentSummary[]> = {
    ready_for_signoff: [],
    missing_info: [],
    awaiting_followup: [],
  }
  for (const inc of pool) {
    const key = attentionQueueGroupKey(inc, nowMs)
    if (!key) continue
    byGroup[key].push(inc)
  }
  for (const g of GROUP_ORDER) {
    byGroup[g].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  }

  const preview: DailyCommandNeedsAttentionRow[] = []
  for (const g of GROUP_ORDER) {
    for (const inc of byGroup[g]) {
      if (preview.length >= MAX_PREVIEW) {
        return { totalInQueue: pool.length, preview }
      }
      const detailHref = buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)
      const signoffHref = buildAdminPathWithContext(
        `/admin/incidents/${encodeURIComponent(inc.id)}/signoff`,
        searchParams,
      )
      const cta = queueRowCta(inc, canAccessPhase2, nowMs, detailHref, signoffHref)
      preview.push({
        incidentId: inc.id,
        group: g,
        groupTitle: GROUP_META[g].title,
        ageLabel: hoursOpenLabel(inc.startedAt, nowMs),
        ctaLabel: cta.label,
        ctaHref: cta.href,
        incidentType: formatIncidentType(inc.incidentType),
      })
    }
  }
  return { totalInQueue: pool.length, preview }
}
