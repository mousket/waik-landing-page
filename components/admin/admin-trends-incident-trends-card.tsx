"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import { trendBucketLabel } from "@/lib/admin/trends-incident-type-buckets"
import { trendsIncidentsListHref } from "@/lib/admin/trends-drilldowns"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsIncidentSeverityMix } from "@/lib/types/trends-incident-trends"
import { cn } from "@/lib/utils"

function pctMix(m: TrendsIncidentSeverityMix): { critical: number; warning: number; normal: number } {
  const t = m.critical + m.warning + m.normal
  if (!t) return { critical: 0, warning: 0, normal: 0 }
  return {
    critical: Math.round((m.critical / t) * 1000) / 10,
    warning: Math.round((m.warning / t) * 1000) / 10,
    normal: Math.round((m.normal / t) * 1000) / 10,
  }
}

function StackedSeverityBar({
  mix,
  range,
  searchParams,
}: {
  mix: TrendsIncidentSeverityMix
  range: TrendsRangeKey
  searchParams: URLSearchParams
}) {
  const t = mix.critical + mix.warning + mix.normal
  const critHref = trendsIncidentsListHref(searchParams, range, { severity: "critical" })
  const warnHref = trendsIncidentsListHref(searchParams, range, { severity: "warning" })
  const normHref = trendsIncidentsListHref(searchParams, range, { severity: "normal" })
  if (!t) {
    return <p className="text-xs text-muted-foreground">No incidents in window for severity mix.</p>
  }
  const cw = `${(mix.critical / t) * 100}%`
  const ww = `${(mix.warning / t) * 100}%`
  const nw = `${(mix.normal / t) * 100}%`
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
        {mix.critical > 0 ? (
          <Link
            href={critHref}
            scroll={false}
            className="h-full bg-rose-500 transition-opacity hover:opacity-90"
            style={{ width: cw }}
            title="Critical"
          />
        ) : null}
        {mix.warning > 0 ? (
          <Link
            href={warnHref}
            scroll={false}
            className="h-full bg-amber-500 transition-opacity hover:opacity-90"
            style={{ width: ww }}
            title="Warning"
          />
        ) : null}
        {mix.normal > 0 ? (
          <Link
            href={normHref}
            scroll={false}
            className="h-full bg-emerald-600/70 transition-opacity hover:opacity-90"
            style={{ width: nw }}
            title="Normal"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Link href={critHref} scroll={false} className="tabular-nums hover:text-rose-600">
          Critical {pctMix(mix).critical}%
        </Link>
        <Link href={warnHref} scroll={false} className="tabular-nums hover:text-amber-700">
          Warning {pctMix(mix).warning}%
        </Link>
        <Link href={normHref} scroll={false} className="tabular-nums hover:text-emerald-700">
          Normal {pctMix(mix).normal}%
        </Link>
      </div>
    </div>
  )
}

function TypeRowBar({
  label,
  current,
  previous,
  maxCurrent,
  href,
}: {
  label: string
  current: number
  previous: number
  maxCurrent: number
  href: string
}) {
  const w = maxCurrent > 0 ? Math.max(8, (current / maxCurrent) * 100) : 0
  const delta = current - previous
  const deltaLabel =
    delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`
  return (
    <Link href={href} scroll={false} className="block rounded-xl border border-transparent px-1 py-2 transition-colors hover:border-border/60 hover:bg-muted/20">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {current}
          <span className={cn("ml-2", delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "")}>
            ({deltaLabel})
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-primary/55 transition-all" style={{ width: `${w}%` }} />
      </div>
    </Link>
  )
}

export function AdminTrendsIncidentTrendsCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.incidentTrends)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load incident trends." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-56" />
  }

  if (!data) return null


  const maxType = data.typeRows.reduce((m, r) => Math.max(m, r.current), 0)
  const curP = pctMix(data.severityCurrent)
  const prevP = pctMix(data.severityPrevious)
  const dCrit = curP.critical - prevP.critical
  const dWarn = curP.warning - prevP.warning
  const dNorm = curP.normal - prevP.normal

  let moverLine: ReactNode = null
  if (data.largestMover && data.largestMover.delta !== 0) {
    const { bucket, delta, current, previous } = data.largestMover
    const label = trendBucketLabel(bucket)
    const dir = delta > 0 ? "up" : "down"
    const href = trendsIncidentsListHref(searchParams, trendsRange, { type: bucket })
    moverLine = (
      <p className="text-sm text-foreground">
        <span className="font-medium">Largest mover:</span>{" "}
        <Link href={href} scroll={false} className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">
          {label} {dir} {delta > 0 ? "+" : ""}
          {delta} vs prior ({previous} → {current})
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    )
  } else if (data.largestMover) {
    moverLine = (
      <p className="text-sm text-muted-foreground">
        No net change in mapped categories vs previous period ({trendBucketLabel(data.largestMover.bucket)} flat).
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Incident trends</h2>
          <p className="text-xs text-muted-foreground">Mapped types in range · {data.range}</p>
        </div>
      </div>

      <div className="mt-5 space-y-1">
        {data.typeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Falls, Skin, Medication, or Behavior–mapped incidents in this window. Severity mix still reflects all
            reports.
          </p>
        ) : (
          data.typeRows.map((row) => (
            <TypeRowBar
              key={row.bucket}
              label={trendBucketLabel(row.bucket)}
              current={row.current}
              previous={row.previous}
              maxCurrent={maxType || 1}
              href={trendsIncidentsListHref(searchParams, trendsRange, { type: row.bucket })}
            />
          ))
        )}
      </div>

      <div className="mt-6 border-t border-border/40 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity mix (current window)</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Uses the same triage signals as Today (injury, clocks, Phase 1 state) evaluated as of now.
        </p>
        <div className="mt-3">
          <StackedSeverityBar mix={data.severityCurrent} range={trendsRange} searchParams={searchParams} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          vs prior window (pts): Critical {dCrit >= 0 ? "+" : ""}
          {dCrit.toFixed(1)} · Warning {dWarn >= 0 ? "+" : ""}
          {dWarn.toFixed(1)} · Normal {dNorm >= 0 ? "+" : ""}
          {dNorm.toFixed(1)}
        </p>
      </div>

      {moverLine ? <div className="mt-5 border-t border-border/40 pt-4">{moverLine}</div> : null}
    </div>
  )
}
