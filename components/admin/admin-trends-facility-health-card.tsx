"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import {
  TrendsCardNoFacility,
  TrendsCardSkeleton,
} from "@/components/admin/admin-trends-card-states"
import { useTrendsSnapshot, useTrendsSnapshotLoading } from "@/components/admin/trends-snapshot-provider"
import {
  trendsDashboardModuleHref,
  trendsIncidentsListHref,
} from "@/lib/admin/trends-drilldowns"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsFacilityHealthWindowMetrics } from "@/lib/types/trends-facility-health"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function deltaToneForMoreIsWorse(delta: number): "better" | "worse" | "neutral" {
  if (delta === 0) return "neutral"
  return delta > 0 ? "worse" : "better"
}

function deltaToneForMoreIsBetter(delta: number): "better" | "worse" | "neutral" {
  if (delta === 0) return "neutral"
  return delta > 0 ? "better" : "worse"
}

function DeltaLine({
  label,
  current,
  previous,
  moreIsBetter,
  format,
}: {
  label: string
  current: number
  previous: number
  moreIsBetter: boolean
  format: (n: number) => string
}) {
  const raw = current - previous
  const tone = moreIsBetter ? deltaToneForMoreIsBetter(raw) : deltaToneForMoreIsWorse(raw)
  const Icon = raw === 0 ? Minus : raw > 0 ? ArrowUpRight : ArrowDownRight
  const cls =
    tone === "better"
      ? "text-emerald-600 dark:text-emerald-500"
      : tone === "worse"
        ? "text-rose-600 dark:text-rose-500"
        : "text-muted-foreground"
  const signed = raw === 0 ? "0" : `${raw > 0 ? "+" : ""}${format(raw)}`
  return (
    <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", cls)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {signed} vs previous period ({label})
      </span>
    </p>
  )
}

function pctExposed(m: TrendsFacilityHealthWindowMetrics): number {
  const t = m.protectionDays.protected + m.protectionDays.atRisk + m.protectionDays.exposed
  if (!t) return 0
  return Math.round((m.protectionDays.exposed / t) * 1000) / 10
}

function TileDefinition({ children }: { children: ReactNode }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none font-medium text-foreground/80 hover:text-foreground">
        Definition
      </summary>
      <p className="mt-2 leading-relaxed">{children}</p>
    </details>
  )
}

function TileShell({
  title,
  href,
  children,
  footer,
  definition,
}: {
  title: string
  href: string
  children: ReactNode
  footer: ReactNode
  definition: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 shadow-sm outline-none ring-offset-background transition-all hover:border-primary/20 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Link href={href} scroll={false} className="group block p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
        </div>
        <div className="mt-3">{children}</div>
        <div className="mt-3 border-t border-border/40 pt-3">{footer}</div>
      </Link>
      <div className="border-t border-border/40 px-4 pb-4 pt-3 sm:px-5">
        <TileDefinition>{definition}</TileDefinition>
      </div>
    </div>
  )
}

export function AdminTrendsFacilityHealthCard({
  trendsRange,
  searchParams,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { snapshot, hasFacility } = useTrendsSnapshot()
  const loading = useTrendsSnapshotLoading()
  const data = snapshot?.facilityHealth ?? null

  const incidentsHref = trendsIncidentsListHref(searchParams, trendsRange)
  const repeatHref = trendsIncidentsListHref(searchParams, trendsRange, { repeat: true })
  const docsHref = trendsIncidentsListHref(searchParams, trendsRange)
  const signoffHref = trendsIncidentsListHref(searchParams, trendsRange, {
    phase: "phase_1_complete,phase_2_in_progress",
  })
  const protectionPath = trendsDashboardModuleHref(searchParams, "trends-e5")

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load trend KPIs." />
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const cur = data.current
  const prev = data.previous

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Facility health summary</h2>
          <p className="text-xs text-muted-foreground">vs previous period · same length · {data.range}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TileShell
          title="Incidents"
          href={incidentsHref}
          definition="Count of incident reports whose start timestamp falls in the selected window (all phases)."
          footer={
            <DeltaLine
              label="count"
              current={cur.incidentCount}
              previous={prev.incidentCount}
              moreIsBetter={false}
              format={(n) => String(Math.round(n))}
            />
          }
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{cur.incidentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reports started in window</p>
        </TileShell>

        <TileShell
          title="Repeat incidents"
          href={repeatHref}
          definition="Share of window incidents where the same resident had another incident started in the 7 days before this report (repeat-within-7d)."
          footer={
            <DeltaLine
              label="rate (pts)"
              current={cur.repeatRatePercent}
              previous={prev.repeatRatePercent}
              moreIsBetter={false}
              format={(n) => `${n.toFixed(1)} pts`}
            />
          }
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{cur.repeatRatePercent}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cur.repeatIncidentCount} of {cur.incidentCount || "—"} reports
          </p>
        </TileShell>

        <TileShell
          title="Documentation"
          href={docsHref}
          definition="Mean documentation completeness (0–100) for incidents started in the window, using recorded completeness scores where available."
          footer={
            <>
              {cur.avgDocumentationPercent != null && prev.avgDocumentationPercent != null ? (
                <DeltaLine
                  label="avg score"
                  current={cur.avgDocumentationPercent}
                  previous={prev.avgDocumentationPercent}
                  moreIsBetter
                  format={(n) => `${Math.round(n)} pts`}
                />
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Insufficient completeness data for delta.</p>
              )}
            </>
          }
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {cur.avgDocumentationPercent != null ? `${cur.avgDocumentationPercent}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Avg completeness</p>
        </TileShell>

        <TileShell
          title="Time to signoff"
          href={signoffHref}
          definition="Median hours from report start to Phase 1 signoff, among incidents started in the window that already have a signoff timestamp."
          footer={
            <>
              {cur.medianHoursToSignoff != null && prev.medianHoursToSignoff != null ? (
                <DeltaLine
                  label="median hours"
                  current={cur.medianHoursToSignoff}
                  previous={prev.medianHoursToSignoff}
                  moreIsBetter={false}
                  format={(n) => `${n.toFixed(1)}h`}
                />
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Insufficient Phase 1 signoffs for delta.</p>
              )}
            </>
          }
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {cur.medianHoursToSignoff != null ? `${cur.medianHoursToSignoff}h` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Median hours · Phase 1</p>
        </TileShell>

        <TileShell
          title="Exposure mix (calendar)"
          href={protectionPath}
          definition={
            <>
              Calendar-day proxy: a day is &quot;Exposed&quot; if any incident <strong>started</strong> that day with
              injury flagged; &quot;At risk&quot; if any incident started without injury; otherwise &quot;Protected&quot;.
              Not a clinical MDS protection state.
            </>
          }
          footer={
            <DeltaLine
              label="% high-intensity days"
              current={pctExposed(cur)}
              previous={pctExposed(prev)}
              moreIsBetter={false}
              format={(n) => `${n.toFixed(1)} pts`}
            />
          }
        >
          <div className="flex flex-wrap gap-3 text-sm tabular-nums">
            <span className="text-muted-foreground">
              P <span className="font-semibold text-foreground">{cur.protectionDays.protected}</span>
            </span>
            <span className="text-muted-foreground">
              AR <span className="font-semibold text-foreground">{cur.protectionDays.atRisk}</span>
            </span>
            <span className="text-muted-foreground">
              E <span className="font-semibold text-foreground">{cur.protectionDays.exposed}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{pctExposed(cur)}% of days in &quot;Exposed&quot;</p>
        </TileShell>
      </div>
    </div>
  )
}
