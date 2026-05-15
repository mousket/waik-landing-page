"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { buildDailyCommandHighRiskResidents } from "@/lib/admin/daily-command-high-risk-residents"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const DRIVER_PILL =
  "rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-[11px]"

export function AdminHighRiskResidentsCard({
  incidents,
  incidentsLoading,
  snapshotError,
  searchParams,
}: {
  incidents: IncidentSummary[]
  incidentsLoading: boolean
  snapshotError?: string | null
  searchParams: URLSearchParams
}) {
  const rows = useMemo(() => {
    const nowMs = Date.now()
    const raw = buildDailyCommandHighRiskResidents(incidents, searchParams, nowMs)
    raw.sort((a, b) => b.sortScore - a.sortScore)
    return raw.slice(0, 5)
  }, [incidents, searchParams])

  const cohortHref = buildAdminPathWithContext("/admin/residents?risk=high", searchParams)

  if (incidentsLoading) {
    return (
      <section
        id="dc-a6"
        className="scroll-mt-24 min-h-[220px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="High-risk residents"
      >
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
        <Skeleton className="mt-2 h-20 w-full rounded-xl" />
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a6"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="High-risk residents"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">High-risk residents</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[180px]" />
      </section>
    )
  }

  return (
    <section
      id="dc-a6"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="High-risk residents"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">High-risk residents</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top residents by explainable signals from the open pipeline (not a black-box score).
          </p>
        </div>
        <Link
          href={cohortHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
        >
          View cohort
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          No clustered risk signals in this snapshot — that is reassuring. You can still open the cohort for a full
          resident pass.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li
              key={r.key}
              className="rounded-xl border border-border/50 bg-card/70 p-3 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4 sm:p-3.5"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Room {r.room}
                    {r.unit && r.unit !== "—" ? (
                      <>
                        {" "}
                        · Unit {r.unit}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.drivers.map((d) => (
                    <span key={d} className={DRIVER_PILL}>
                      {d}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{r.whyNow}</p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className={cn(
                  "mt-3 h-9 w-full shrink-0 border-primary/25 bg-gradient-to-b from-primary/12 to-primary/5 font-semibold text-primary sm:mt-0 sm:h-8 sm:w-auto",
                )}
              >
                <Link href={r.bundleHref} className="inline-flex items-center justify-center gap-1">
                  Open risk bundle
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
