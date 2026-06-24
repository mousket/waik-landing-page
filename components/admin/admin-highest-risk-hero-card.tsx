"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { dailyCommandAttentionQueueHref } from "@/lib/admin/daily-command-drilldowns"
import { rankDailyCommandHighestRisk } from "@/lib/admin/daily-command-highest-risk"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import { cn } from "@/lib/utils"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminHighestRiskHeroCard({
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
  const { top, total } = useMemo(() => {
    const nowMs = Date.now()
    const all = rankDailyCommandHighestRisk(incidents, searchParams, canAccessPhase2, nowMs)
    return { top: all.slice(0, 3), total: all.length }
  }, [incidents, canAccessPhase2, searchParams])

  const viewAllHref = dailyCommandAttentionQueueHref(searchParams)

  if (incidentsLoading) {
    return (
      <section
        id="dc-a2"
        className="scroll-mt-24 min-h-[220px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/20 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="Highest risk right now"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a2"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/20 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="Highest risk right now"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Highest risk right now</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[200px]" />
      </section>
    )
  }

  return (
    <section
      id="dc-a2"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/20 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="Highest risk right now"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Highest risk right now</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by severity (critical before warning), then oldest first, then injury-flagged items.
          </p>
        </div>
        {total > 3 ? (
          <Link
            href={viewAllHref}
            className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
          >
            View all ({total})
          </Link>
        ) : null}
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Nothing critical in this queue right now — a good moment to clear follow-ups in Open investigations below.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {top.map((row) => (
            <li
              key={row.incident.id}
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card/80 p-3 pl-3.5 shadow-sm sm:p-4 sm:pl-4",
                row.tier === 0
                  ? "border-destructive/25 ring-1 ring-destructive/10"
                  : "border-amber-500/20 ring-1 ring-amber-500/10",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none absolute left-0 top-0 h-full w-[3px]",
                  row.tier === 0 ? "bg-gradient-to-b from-destructive to-destructive/70" : "bg-gradient-to-b from-amber-500 to-amber-600/80",
                )}
                aria-hidden
              />
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-w-0 flex-1 space-y-1 pl-0.5">
                  <p className="text-xs font-semibold text-foreground">{row.what}</p>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {row.incident.residentName ? (
                      <>
                        <span className="font-medium text-foreground/90">{row.incident.residentName}</span>
                        {row.incident.residentRoom ? (
                          <span className="text-muted-foreground"> · Room {row.incident.residentRoom}</span>
                        ) : null}
                        <span className="text-muted-foreground"> · </span>
                      </>
                    ) : null}
                    {formatIncidentType(row.incident.incidentType)}
                  </p>
                  <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">{row.whyNow}</p>
                  <p className="text-[10px] text-muted-foreground sm:text-[11px]">
                    Owner: <span className="font-medium text-foreground/90">{row.owner}</span>
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="mt-auto h-9 w-full shrink-0 border border-primary/25 bg-gradient-to-b from-primary/15 to-primary/5 font-semibold text-primary shadow-sm hover:from-primary/20 hover:to-primary/10"
                  variant="outline"
                >
                  <Link href={row.ctaHref} className="inline-flex items-center justify-center gap-1">
                    {row.ctaLabel}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
