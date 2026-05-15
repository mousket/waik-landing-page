"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { buildDailyCommandStaffThroughputSlice } from "@/lib/admin/daily-command-staff-throughput"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Skeleton } from "@/components/ui/skeleton"

export function AdminStaffThroughputCard({
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
  const model = useMemo(() => {
    const nowMs = Date.now()
    const slice = buildDailyCommandStaffThroughputSlice(incidents, nowMs)
    return {
      units: slice.units,
      unassignedP2: slice.unassignedPhase2,
      thinP1: slice.thinPhase1Beyond12h,
      whoHelp: slice.reporterLoad,
    }
  }, [incidents])

  const activityHref = buildAdminPathWithContext("/admin/settings/activity", searchParams)
  const staffHref = buildAdminPathWithContext("/admin/settings/staff", searchParams)
  const missingAssignHref = buildAdminPathWithContext(
    "/admin/incidents?range=today&bottleneck=missing_assignment",
    searchParams,
  )
  const missingInfoHref = buildAdminPathWithContext(
    "/admin/incidents?range=today&bottleneck=missing_info",
    searchParams,
  )

  if (incidentsLoading) {
    return (
      <section
        id="dc-a7"
        className="scroll-mt-24 min-h-[180px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="Staff support and throughput"
      >
        <Skeleton className="h-5 w-56 rounded-md" />
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a7"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="Staff support and throughput"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Staff support</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[140px]" />
      </section>
    )
  }

  const hasOutliers =
    model.units.length > 0 || model.unassignedP2 > 0 || model.thinP1 > 0 || model.whoHelp.length > 0

  return (
    <section
      id="dc-a7"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="Staff support and throughput"
    >
      <div className="border-b border-border/40 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Staff support</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Outliers only — where units or people may need backup (supportive tone, not surveillance).
        </p>
      </div>

      {!hasOutliers ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          No strain outliers in this snapshot — teams look balanced from this angle. Activity and staff links stay
          available if you want to check in anyway.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {model.units.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit strain</p>
              <ul className="mt-2 space-y-2">
                {model.units.map((u) => (
                  <li key={u.unit}>
                    <Link
                      href={buildAdminPathWithContext(
                        `/admin/incidents?range=today&unit=${encodeURIComponent(u.unit)}`,
                        searchParams,
                      )}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-xs hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="font-medium text-foreground">{u.unit}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {u.strain} hot · {u.open} open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(model.unassignedP2 > 0 || model.thinP1 > 0) ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Process blockers</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {model.unassignedP2 > 0 ? (
                  <li>
                    <Link href={missingAssignHref} className="font-medium text-primary hover:underline">
                      Needs assignment
                    </Link>
                    {" — "}
                    {model.unassignedP2} Phase 2 investigation{model.unassignedP2 === 1 ? "" : "s"} without an
                    investigator listed.
                  </li>
                ) : null}
                {model.thinP1 > 0 ? (
                  <li>
                    <Link href={missingInfoHref} className="font-medium text-primary hover:underline">
                      Thin Phase 1 packages
                    </Link>
                    {" — "}
                    {model.thinP1} report{model.thinP1 === 1 ? "" : "s"} with low completeness after 12h+ open.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {model.whoHelp.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Who may need help</p>
              <ul className="mt-2 space-y-3">
                {model.whoHelp.map((w) => (
                  <li
                    key={w.name}
                    className="rounded-xl border border-border/50 bg-card/60 p-3 text-xs sm:flex sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{w.name}</p>
                      <p className="mt-1 text-muted-foreground">{w.detail}</p>
                    </div>
                    <div className="mt-2 flex shrink-0 flex-wrap gap-2 sm:mt-0">
                      <Link
                        href={activityHref}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary/35"
                      >
                        Activity
                        <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </Link>
                      <Link
                        href={staffHref}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
                      >
                        Staff list
                        <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
