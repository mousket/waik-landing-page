"use client"

import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsPatternInsight } from "@/lib/types/trends-pattern-insights"

export function AdminTrendsPatternInsightsCard({
  trendsRange,
  searchParams,
  facilityId,
}: {
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.patternInsights)

  if (!hasFacility) {
    return <TrendsCardNoFacility message="Select a facility to load pattern insights." />
  }

  if (loading) {
    return <TrendsCardSkeleton heightClass="h-64" />
  }

  if (!data) return null


  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Pattern insights</h2>
        <p className="text-xs text-muted-foreground">
          Evidence-backed clusters in the current window · max 3 · {data.range}
        </p>
      </div>

      {data.insights.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No meaningful pattern detected in this range.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {data.insights.map((insight: TrendsPatternInsight, idx: number) => {
            const href = buildAdminPathWithContext(insight.evidencePath, searchParams)
            return (
              <li
                key={`${insight.kind}-${idx}`}
                className="rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4"
              >
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-foreground/90">{insight.evidenceLine}</p>
                {insight.whereLine ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Where:</span> {insight.whereLine}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{insight.whyLine}</p>
                <Link
                  href={href}
                  scroll={false}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  View evidence
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
