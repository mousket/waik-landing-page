"use client"

import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { trendsResidentsHighRiskHref } from "@/lib/admin/trends-drilldowns"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsHighRiskCohortTimeseriesPoint } from "@/lib/types/trends-high-risk-cohort"
import { cn } from "@/lib/utils"

function CohortSparkline({ points }: { points: TrendsHighRiskCohortTimeseriesPoint[] }) {
  const vals = points.map((p) => p.residentCount)
  if (vals.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough buckets for a trend line.</p>
  }
  const w = 280
  const h = 48
  const pad = 4
  const max = Math.max(...vals, 1)
  const min = 0
  const span = max - min || 1
  const coords = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / span) * (h - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full max-w-md text-primary" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
        opacity={0.85}
      />
    </svg>
  )
}

export function AdminTrendsHighRiskCohortCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.highRiskCohort)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load high-risk cohort trends." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-64" />
  }

  if (!data) return null

  const cohortHref = trendsResidentsHighRiskHref(searchParams, trendsRange)
  const cohortDelta = data.cohortCountCurrent - data.cohortCountPrevious

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">High-risk cohort</h2>
          <p className="text-xs text-muted-foreground">
            Residents with clustered signals in-window (same heuristics as Today, scoped to the range) · {data.range}
          </p>
        </div>
        <Link
          href={cohortHref}
          scroll={false}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          View cohort
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/40 bg-card/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In cohort (window)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{data.cohortCountCurrent}</p>
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              cohortDelta > 0 ? "text-amber-700 dark:text-amber-500" : cohortDelta < 0 ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {cohortDelta === 0 ? "Flat" : `${cohortDelta > 0 ? "+" : ""}${cohortDelta}`} vs previous period (
            {data.cohortCountPrevious} prior)
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">New this period</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{data.newlyFlaggedCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">First time in cohort vs prior window.</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-3 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Activity pulse</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Cohort members with a report start in each bucket.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/40 bg-card/40 p-3">
        <CohortSparkline points={data.cohortTrend} />
      </div>

      {data.driverRows.length > 0 ? (
        <div className="mt-6 border-t border-border/40 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top drivers (max 3)</p>
          <ul className="mt-3 space-y-2">
            {data.driverRows.map((row) => {
              const href = trendsResidentsHighRiskHref(searchParams, trendsRange, row.key)
              const d = row.deltaVsPrevious
              return (
                <li key={row.key}>
                  <Link
                    href={href}
                    scroll={false}
                    className="flex items-center justify-between gap-2 rounded-xl border border-transparent px-2 py-2 text-sm transition-colors hover:border-border/60 hover:bg-muted/20"
                  >
                    <span className="font-semibold text-foreground">{row.label}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {row.residentCount} res.
                      <span
                        className={cn(
                          "ml-2",
                          d > 0 ? "text-amber-700 dark:text-amber-500" : d < 0 ? "text-emerald-600" : "",
                        )}
                      >
                        ({d > 0 ? "+" : ""}
                        {d} vs prior)
                      </span>
                      <ArrowUpRight className="ml-1 inline h-3 w-3 text-primary" aria-hidden />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">No ranked drivers in this window — cohort may be small.</p>
      )}
    </div>
  )
}
