"use client"

import { useRouter } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { useMemo } from "react"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import Link from "next/link"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import { trendGlyph } from "@/lib/utils/dashboard-trends"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw } from "lucide-react"

const STATS_CARD_CLASS =
  "rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-4 shadow-sm"

function TrendMark({ current, prev, higherIsBetter }: { current: number; prev: number; higherIsBetter: boolean }) {
  const g = trendGlyph(current, prev, higherIsBetter)
  if (!g) return null
  const color =
    g.tone === "good" ? "text-emerald-600" : g.tone === "bad" ? "text-amber-500" : "text-muted-foreground"
  return <span className={`ml-1 text-xs font-semibold ${color}`}>{g.symbol}</span>
}

function formatAssessmentLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function AssessmentDueFromNow({ nextDueAt }: { nextDueAt: string }) {
  const label = useHydrationSafeRelativeTime(nextDueAt)
  return <>{label}</>
}

export function StatsSidebar({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  onRetry?: () => void
}) {
  const router = useRouter()
  const searchParams = useAdminUrlSearchParams()
  const assessmentsHref = useMemo(
    () => buildAdminPathWithContext("/admin/assessments", searchParams),
    [searchParams],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`${STATS_CARD_CLASS} min-h-[220px]`}>
          <Skeleton className="h-4 w-28" />
          <ul className="mt-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-border/60 pb-3 last:border-0">
                <Skeleton className="h-9 w-14" />
                <div className="flex-1 space-y-2 text-right">
                  <Skeleton className="ml-auto h-4 w-32" />
                  <Skeleton className="ml-auto h-3 w-20" />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Skeleton className="h-40 w-full min-h-[10rem] rounded-2xl" />
        <Skeleton className="h-24 w-full min-h-[6rem] rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${STATS_CARD_CLASS} min-h-[12rem]`}>
        <p className="text-sm font-semibold text-foreground">30-day stats paused</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{error}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Sidebar metrics are cached on the server — a retry usually clears transient issues.
        </p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 h-9 w-full rounded-xl border-border/60 font-semibold"
            onClick={onRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Retry stats
          </Button>
        ) : null}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`${STATS_CARD_CLASS} text-sm text-muted-foreground`}>
        Select a facility to load last-30-day counts and upcoming assessments.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={STATS_CARD_CLASS}>
        <h3 className="text-sm font-semibold text-primary">Last 30 Days</h3>
        <ul className="mt-4 space-y-4 text-sm">
          <li className="flex justify-between gap-2 border-b border-border/60 pb-3">
            <span className="text-3xl font-bold tabular-nums text-primary">{stats.totalIncidents30d}</span>
            <div className="text-right">
              <p className="font-medium text-foreground">Total Incidents</p>
              <p className="text-xs text-muted-foreground">
                vs {stats.totalIncidentsPrev30d} prior 30d
                <TrendMark current={stats.totalIncidents30d} prev={stats.totalIncidentsPrev30d} higherIsBetter={false} />
              </p>
            </div>
          </li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-3">
            <span className="text-3xl font-bold tabular-nums text-primary">{stats.avgCompleteness30d}%</span>
            <div className="text-right">
              <p className="font-medium text-foreground">Avg Completeness</p>
              <p className="text-xs text-muted-foreground">
                vs {stats.avgCompletenessPrev30d}%
                <TrendMark
                  current={stats.avgCompleteness30d}
                  prev={stats.avgCompletenessPrev30d}
                  higherIsBetter
                />
              </p>
            </div>
          </li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-3">
            <span className="text-3xl font-bold tabular-nums text-primary">{stats.avgDaysToClose30d}</span>
            <div className="text-right">
              <p className="font-medium text-foreground">Avg Days to Close</p>
              <p className="text-xs text-muted-foreground">
                vs {stats.avgDaysToClosePrev30d}
                <TrendMark
                  current={stats.avgDaysToClose30d}
                  prev={stats.avgDaysToClosePrev30d}
                  higherIsBetter={false}
                />
              </p>
            </div>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-3xl font-bold tabular-nums text-primary">{stats.injuryFlagPercent30d}%</span>
            <div className="text-right">
              <p className="font-medium text-foreground">With Injury Flag</p>
              <p className="text-xs text-muted-foreground">—</p>
            </div>
          </li>
        </ul>
      </div>

      <div className={STATS_CARD_CLASS}>
        <h3 className="text-sm font-semibold text-primary">Due This Week</h3>
        {stats.upcomingAssessments7d === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No assessments due in the next 7 days.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {stats.upcomingAssessmentItems.map((row, idx) => {
              const due = row.nextDueAt ? new Date(row.nextDueAt) : null
              const hasValidDue = due && !Number.isNaN(due.getTime())
              return (
                <li key={`${row.residentRoom}-${row.assessmentType}-${idx}`}>
                  Room {row.residentRoom} — {formatAssessmentLabel(row.assessmentType)} —{" "}
                  {hasValidDue && row.nextDueAt ? (
                    <AssessmentDueFromNow nextDueAt={row.nextDueAt} />
                  ) : (
                    "Soon"
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <Link href={assessmentsHref} className="mt-3 inline-block text-sm font-semibold text-primary">
          View all →
        </Link>
      </div>

      <div className={STATS_CARD_CLASS}>
        <h3 className="text-sm font-semibold text-primary">Ask your community...</h3>
        <Input
          placeholder="e.g. How many falls this month?"
          className="mt-3 min-h-[48px]"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            const q = (e.currentTarget as HTMLInputElement).value.trim()
            if (!q) return
            const base = buildAdminPathWithContext("/admin/intelligence", searchParams)
            const u = new URL(base, "http://localhost")
            u.searchParams.set("q", q)
            router.push(`${u.pathname}${u.search}`)
          }}
        />
      </div>
    </div>
  )
}
