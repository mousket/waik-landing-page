"use client"

import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type {
  InterventionSnapshotMetrics,
  TrendsInterventionEffectivenessItem,
  TrendsInterventionEffectivenessResponse,
} from "@/lib/types/trends-intervention-effectiveness"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function MetricRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground/80">{before}</span>
      <span className="tabular-nums font-medium text-foreground">{after}</span>
    </div>
  )
}

function formatMetrics(m: InterventionSnapshotMetrics) {
  return {
    incidents: String(m.incidentCount),
    repeats: String(m.repeatCount),
    docs: m.avgDocumentationPercent != null ? `${m.avgDocumentationPercent}%` : "—",
  }
}

function SnapshotCompare({ item }: { item: TrendsInterventionEffectivenessItem }) {
  const b = formatMetrics(item.before)
  const a = formatMetrics(item.after)
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Metric</span>
        <span>Prior</span>
        <span>Current</span>
      </div>
      <MetricRow label="Reports in scope" before={b.incidents} after={a.incidents} />
      <MetricRow label="Repeat (7d)" before={b.repeats} after={a.repeats} />
      <MetricRow label="Avg documentation" before={b.docs} after={a.docs} />
    </div>
  )
}

export function AdminTrendsInterventionEffectivenessCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.interventionEffectiveness)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load intervention effectiveness." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-64" />
  }

  if (!data) return null


  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Intervention effectiveness</h2>
        <p className="text-xs text-muted-foreground">
          Directional before/after snapshots (prior vs current window) · not causal · {data.range}
        </p>
      </div>

      {data.items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Not enough paired volume to show comparison lenses for this range. Try 30d or 90d when more reports are in the
          window.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {data.items.map((item) => {
            const beforeHref = buildAdminPathWithContext(item.evidencePathBefore, searchParams)
            const afterHref = buildAdminPathWithContext(item.evidencePathAfter, searchParams)
            return (
              <li key={item.id} className="rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.scopeLine}</p>
                <p className="mt-2 inline-flex rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                  Directional signal
                </p>
                <SnapshotCompare item={item} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Prior: {item.beforePeriodLabel} · Current: {item.afterPeriodLabel}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={beforeHref}
                    scroll={false}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    View evidence (prior)
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <Link
                    href={afterHref}
                    scroll={false}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    View evidence (current)
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
