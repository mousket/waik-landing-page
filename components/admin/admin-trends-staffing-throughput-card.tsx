"use client"

import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { trendsIncidentsListHref } from "@/lib/admin/trends-drilldowns"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type {
  TrendsStaffingBacklogPoint,
  TrendsStaffingThroughputResponse,
} from "@/lib/types/trends-staffing-throughput"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function BacklogSparkline({ points }: { points: TrendsStaffingBacklogPoint[] }) {
  const vals = points.map((p) => p.overdueCount)
  if (vals.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough buckets for a backlog trend.</p>
  }
  const w = 280
  const h = 48
  const pad = 4
  const max = Math.max(...vals, 1)
  const coords = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
    const y = pad + (1 - v / max) * (h - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full max-w-md text-amber-600 dark:text-amber-500" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
        opacity={0.9}
      />
    </svg>
  )
}

export function AdminTrendsStaffingThroughputCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.staffingThroughput)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load staffing throughput." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-64" />
  }

  if (!data) return null


  const overdueDelta = data.currentOverdueCount - data.previousOverdueCount
  const overdueHref = trendsIncidentsListHref(searchParams, trendsRange, { bottleneck: "overdue_docs" })

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Staffing & throughput</h2>
        <p className="text-xs text-muted-foreground">
          Where to support · unit and process level · reports started in window · {data.range}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-border/40 bg-card/40 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Documentation overdue (window)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{data.currentOverdueCount}</p>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                overdueDelta > 0
                  ? "text-amber-700 dark:text-amber-500"
                  : overdueDelta < 0
                    ? "text-emerald-600"
                    : "text-muted-foreground",
              )}
            >
              {overdueDelta === 0 ? "Flat" : `${overdueDelta > 0 ? "+" : ""}${overdueDelta}`} vs previous period (
              {data.previousOverdueCount} prior)
            </p>
          </div>
          <Link
            href={overdueHref}
            scroll={false}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Open queue
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-4">
          <p className="text-[11px] text-muted-foreground">Overdue signal by bucket (reports started in bucket).</p>
          <BacklogSparkline points={data.backlogTrend} />
        </div>
      </div>

      {data.bottleneckRows.length > 0 ? (
        <div className="mt-6 border-t border-border/40 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bottleneck reasons (top 3)
          </p>
          <ul className="mt-3 space-y-2">
            {data.bottleneckRows.map((row) => {
              const href = trendsIncidentsListHref(searchParams, trendsRange, { bottleneck: row.key })
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
                      {row.count}
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
        <p className="mt-6 text-sm text-muted-foreground">No ranked bottlenecks in this window.</p>
      )}

      {data.unitStrainRows.length > 0 ? (
        <div className="mt-6 border-t border-border/40 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit strain (top 2)</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Open reports with overdue or critical triage signals.</p>
          <ul className="mt-3 space-y-2">
            {data.unitStrainRows.map((row) => {
              const href = trendsIncidentsListHref(searchParams, trendsRange, { unit: row.unit })
              return (
                <li key={row.unit}>
                  <Link
                    href={href}
                    scroll={false}
                    className="block rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-foreground">{row.unit}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {row.strain} strain · {row.open} open
                        <ArrowUpRight className="ml-1 inline h-3 w-3 text-primary" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
