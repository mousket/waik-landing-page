"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { brand } from "@/lib/design-tokens"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import { trendGlyph } from "@/lib/utils/dashboard-trends"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

function TrendMark({ current, prev, higherIsBetter }: { current: number; prev: number; higherIsBetter: boolean }) {
  const g = trendGlyph(current, prev, higherIsBetter)
  if (!g) return null
  const color =
    g.tone === "good" ? "text-emerald-600" : g.tone === "bad" ? "text-amber-500" : "text-brand-muted"
  return <span className={`ml-1 text-xs font-semibold ${color}`}>{g.symbol}</span>
}

function formatAssessmentLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatsSidebar({
  stats,
  loading,
  error,
}: {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
}) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <ul className="mt-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3 last:border-0">
                <Skeleton className="h-9 w-14" />
                <div className="flex-1 space-y-2 text-right">
                  <Skeleton className="ml-auto h-4 w-32" />
                  <Skeleton className="ml-auto h-3 w-20" />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-brand-mid-gray bg-white p-4 text-sm text-brand-muted shadow-sm">
        {error ?? "Stats unavailable."}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-dark-teal">Last 30 Days</h3>
        <ul className="mt-4 space-y-4 text-sm">
          <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: brand.teal }}>
              {stats.totalIncidents30d}
            </span>
            <div className="text-right">
              <p className="font-medium text-brand-body">Total Incidents</p>
              <p className="text-xs text-brand-muted">
                vs {stats.totalIncidentsPrev30d} prior 30d
                <TrendMark current={stats.totalIncidents30d} prev={stats.totalIncidentsPrev30d} higherIsBetter={false} />
              </p>
            </div>
          </li>
          <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: brand.teal }}>
              {stats.avgCompleteness30d}%
            </span>
            <div className="text-right">
              <p className="font-medium text-brand-body">Avg Completeness</p>
              <p className="text-xs text-brand-muted">
                vs {stats.avgCompletenessPrev30d}%
                <TrendMark
                  current={stats.avgCompleteness30d}
                  prev={stats.avgCompletenessPrev30d}
                  higherIsBetter
                />
              </p>
            </div>
          </li>
          <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: brand.teal }}>
              {stats.avgDaysToClose30d}
            </span>
            <div className="text-right">
              <p className="font-medium text-brand-body">Avg Days to Close</p>
              <p className="text-xs text-brand-muted">
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
            <span className="text-3xl font-bold tabular-nums" style={{ color: brand.teal }}>
              {stats.injuryFlagPercent30d}%
            </span>
            <div className="text-right">
              <p className="font-medium text-brand-body">With Injury Flag</p>
              <p className="text-xs text-brand-muted">—</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-dark-teal">Due This Week</h3>
        {stats.upcomingAssessments7d === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No assessments due in the next 7 days.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-brand-body">
            {stats.upcomingAssessmentItems.map((row, idx) => {
              const due = row.nextDueAt ? new Date(row.nextDueAt) : null
              const dueLabel =
                due && !Number.isNaN(due.getTime())
                  ? formatDistanceToNow(due, { addSuffix: true })
                  : "Soon"
              return (
                <li key={`${row.residentRoom}-${row.assessmentType}-${idx}`}>
                  Room {row.residentRoom} — {formatAssessmentLabel(row.assessmentType)} — {dueLabel}
                </li>
              )
            })}
          </ul>
        )}
        <Link href="/admin/assessments" className="mt-3 inline-block text-sm font-semibold text-brand-teal">
          View all →
        </Link>
      </div>

      <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-dark-teal">Ask your community...</h3>
        <Input
          placeholder="e.g. How many falls this month?"
          className="mt-3 min-h-[48px]"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            const q = (e.currentTarget as HTMLInputElement).value.trim()
            if (!q) return
            router.push(`/admin/intelligence?q=${encodeURIComponent(q)}`)
          }}
        />
      </div>
    </div>
  )
}
