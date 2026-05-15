"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { buildDailyCommandNeedsAttentionSlice } from "@/lib/admin/daily-command-needs-attention-preview"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const MAX_VISIBLE = 8

const GROUP_HEADINGS: Record<
  "ready_for_signoff" | "missing_info" | "awaiting_followup",
  { title: string; description: string; bottleneck: string }
> = {
  ready_for_signoff: {
    title: "Ready for sign-off",
    bottleneck: "ready_for_signoff",
    description: "Investigation sections complete — signatures pending.",
  },
  missing_info: {
    title: "Missing info",
    bottleneck: "missing_info",
    description: "Phase 1 still open — finish intake and attachments.",
  },
  awaiting_followup: {
    title: "Awaiting follow-up",
    bottleneck: "awaiting_followup",
    description: "Claims, IDT replies, or Phase 2 work in motion.",
  },
}

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminNeedsAttentionTodayCard({
  incidents,
  incidentsLoading,
  snapshotError,
  searchParams,
  canAccessPhase2,
}: {
  incidents: IncidentSummary[]
  incidentsLoading: boolean
  snapshotError?: string | null
  searchParams: URLSearchParams
  canAccessPhase2: boolean
}) {
  const router = useRouter()

  const { rows, total } = useMemo(() => {
    const nowMs = Date.now()
    const slice = buildDailyCommandNeedsAttentionSlice(incidents, searchParams, canAccessPhase2, nowMs)
    const rows = slice.preview.slice(0, MAX_VISIBLE).flatMap((p) => {
      const incident = incidents.find((i) => i.id === p.incidentId)
      if (!incident) return []
      return [
        {
          incident,
          group: p.group,
          blockerLabel: p.groupTitle,
          ageLabel: p.ageLabel,
          cta: { label: p.ctaLabel, href: p.ctaHref },
        },
      ]
    })
    return { rows, total: slice.totalInQueue }
  }, [incidents, canAccessPhase2, searchParams])

  const viewQueueHref = buildAdminPathWithContext("/admin/incidents?range=today&attention=1", searchParams)

  if (incidentsLoading) {
    return (
      <section
        id="dc-a3"
        className="scroll-mt-24 min-h-[240px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="Needs attention today"
      >
        <div className="mb-4 flex justify-between gap-2">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a3"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="Needs attention today"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs attention</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[200px]" />
      </section>
    )
  }

  return (
    <section
      id="dc-a3"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="Needs attention today"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs attention</h2>
          <p className="mt-1 text-xs text-muted-foreground">Grouped by what is blocking progress right now.</p>
        </div>
        <Link
          href={viewQueueHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
        >
          View queue
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Nothing needs attention in this snapshot — the open pipeline may still have work; use{" "}
          <span className="font-medium text-foreground/90">Open investigations</span> below for the full list.
        </p>
      ) : (
        <>
          {total > MAX_VISIBLE ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {Math.min(MAX_VISIBLE, rows.length)} of {total} — use View queue for the full list.
            </p>
          ) : null}
          <ul className="mt-3 space-y-4">
            {rows.map((row, i) => {
              const showHeading = i === 0 || rows[i - 1]!.group !== row.group
              const meta = GROUP_HEADINGS[row.group]
              const groupHref = buildAdminPathWithContext(
                `/admin/incidents?range=today&bottleneck=${encodeURIComponent(meta.bottleneck)}`,
                searchParams,
              )
              const detailHref = buildAdminPathWithContext(
                `/admin/incidents/${encodeURIComponent(row.incident.id)}`,
                searchParams,
              )
              const inc = row.incident

              return (
                <li key={inc.id} className="list-none">
                  {showHeading ? (
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <Link
                          href={groupHref}
                          className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/90 hover:text-primary hover:underline"
                        >
                          {meta.title}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{meta.description}</p>
                      </div>
                    </div>
                  ) : null}
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border/50 bg-card/70 p-3 shadow-sm transition hover:border-primary/20 hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3.5"
                    onClick={() => router.push(detailHref)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        router.push(detailHref)
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          {formatIncidentType(inc.incidentType)}
                        </span>
                        <span className="text-xs font-semibold text-foreground">{inc.residentName || "Unknown"}</span>
                        {inc.residentRoom ? (
                          <span className="text-[11px] text-muted-foreground">Room {inc.residentRoom}</span>
                        ) : null}
                        <span className="text-[11px] tabular-nums text-muted-foreground">{row.ageLabel}</span>
                      </div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {row.blockerLabel}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="relative z-10 h-9 w-full shrink-0 border-primary/25 bg-gradient-to-b from-primary/12 to-primary/5 font-semibold text-primary hover:from-primary/18 hover:to-primary/8 sm:h-8 sm:w-auto sm:min-w-[6.5rem]"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(row.cta.href)
                      }}
                    >
                      {row.cta.label}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
