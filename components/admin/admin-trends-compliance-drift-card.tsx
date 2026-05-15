"use client"

import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { trendsIncidentsListHref } from "@/lib/admin/trends-drilldowns"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type {
  TrendsComplianceDriftBreakdownRow,
  TrendsComplianceDriftResponse,
  TrendsComplianceDriftTimeseriesPoint,
} from "@/lib/types/trends-compliance-drift"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function CompletionSparkline({ points }: { points: TrendsComplianceDriftTimeseriesPoint[] }) {
  const withData = points.filter((p) => p.avgCompletionPercent != null)
  if (withData.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough bucketed data for a trend line.</p>
  }

  const w = 280
  const h = 48
  const pad = 4
  const vals = withData.map((p) => p.avgCompletionPercent!)
  const min = Math.max(0, Math.min(...vals) - 5)
  const max = Math.min(100, Math.max(...vals) + 5)
  const span = max - min || 1

  const coords = withData.map((p, i) => {
    const x = pad + (i / (withData.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (p.avgCompletionPercent! - min) / span) * (h - pad * 2)
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

function BreakdownRow({
  row,
  href,
  barTone = "default",
}: {
  row: TrendsComplianceDriftBreakdownRow
  href: string
  barTone?: "default" | "muted"
}) {
  const w = Math.min(100, Math.max(8, row.currentPercent))
  const deltaLabel =
    row.deltaPts === 0 ? "±0 pts" : `${row.deltaPts > 0 ? "+" : ""}${row.deltaPts} pts`
  return (
    <Link
      href={href}
      scroll={false}
      className="block rounded-xl border border-transparent px-1 py-2 transition-colors hover:border-border/60 hover:bg-muted/20"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">{row.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {row.currentPercent}%
          <span
            className={cn(
              "ml-2",
              row.deltaPts > 0 ? "text-emerald-600" : row.deltaPts < 0 ? "text-amber-700 dark:text-amber-500" : "",
            )}
          >
            ({deltaLabel})
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            barTone === "muted" ? "bg-muted-foreground/35" : "bg-primary/55",
          )}
          style={{ width: `${w}%` }}
        />
      </div>
    </Link>
  )
}

function unitHref(range: TrendsRangeKey, unit: string, searchParams: URLSearchParams): string {
  if (unit === "__others__") {
    return trendsIncidentsListHref(searchParams, range)
  }
  return trendsIncidentsListHref(searchParams, range, { unit })
}

function roleHref(range: TrendsRangeKey, roleKey: string, searchParams: URLSearchParams): string {
  return trendsIncidentsListHref(searchParams, range, { role: roleKey })
}

export function AdminTrendsComplianceDriftCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.complianceDrift)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load compliance drift." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-72" />
  }

  if (!data) return null


  const avgDelta =
    data.currentAvgPercent != null && data.previousAvgPercent != null
      ? data.currentAvgPercent - data.previousAvgPercent
      : null

  let slipLine: ReactNode = null
  if (data.biggestSlip) {
    const { biggestSlip } = data
    const href =
      biggestSlip.kind === "unit"
        ? unitHref(trendsRange, biggestSlip.key, searchParams)
        : roleHref(trendsRange, biggestSlip.key, searchParams)
    slipLine = (
      <p className="text-sm text-foreground">
        <span className="font-medium">Where to support:</span>{" "}
        <Link
          href={href}
          scroll={false}
          className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
        >
          {biggestSlip.label} completion {biggestSlip.deltaPts > 0 ? "up" : "down"}{" "}
          {biggestSlip.deltaPts > 0 ? "+" : ""}
          {biggestSlip.deltaPts}% vs prior {data.range} ({biggestSlip.previousPercent}% →{" "}
          {biggestSlip.currentPercent}%)
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    )
  } else {
    slipLine = (
      <p className="text-sm text-muted-foreground">
        No unit or role slipped vs the prior period — completion held steady or improved everywhere we track.
      </p>
    )
  }

  const unitRows = [...data.unitRows, ...(data.othersUnit ? [data.othersUnit] : [])]

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Compliance drift</h2>
        <p className="text-xs text-muted-foreground">
          Documentation completion in range · where units need support · {data.range}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-border/40 bg-card/40 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Avg completion (current window)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {data.currentAvgPercent != null ? `${data.currentAvgPercent}%` : "—"}
            </p>
            {avgDelta != null ? (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  avgDelta > 0 ? "text-emerald-600" : avgDelta < 0 ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground",
                )}
              >
                {avgDelta === 0 ? "Flat" : `${avgDelta > 0 ? "+" : ""}${avgDelta} pts`} vs previous period
                {data.previousAvgPercent != null ? ` (${data.previousAvgPercent}% prior)` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <CompletionSparkline points={data.completionTrend} />
        </div>
      </div>

      {unitRows.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By unit / wing</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Top areas by report volume · derived from room codes.</p>
          <div className="mt-2 space-y-1">
            {unitRows.map((row) => (
              <BreakdownRow
                key={row.key}
                row={row}
                href={unitHref(trendsRange, row.key, searchParams)}
                barTone={row.key === "__others__" ? "muted" : "default"}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Not enough unit-level reports to show a breakdown.</p>
      )}

      {data.roleRows.length > 0 ? (
        <div className="mt-6 border-t border-border/40 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By reporter role</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Support lens — not individual performance.</p>
          <div className="mt-2 space-y-1">
            {data.roleRows.map((row) => (
              <BreakdownRow key={row.key} row={row} href={roleHref(trendsRange, row.key, searchParams)} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-border/40 pt-4">{slipLine}</div>
    </div>
  )
}
