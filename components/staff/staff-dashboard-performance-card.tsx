"use client"

import { useRouter } from "next/navigation"
import { Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { trendGlyph } from "@/lib/utils/dashboard-trends"

export type StaffDashboardPerformance = {
  averageCompleteness30d: number
  averageCompleteness30dPrev: number
  currentStreak: number
  bestStreak: number
  totalReports30d: number
  generatedAt?: string
}

function TrendPill({
  current,
  prev,
  higherIsBetter,
}: {
  current: number
  prev: number
  higherIsBetter: boolean
}) {
  const g = trendGlyph(current, prev, higherIsBetter)
  if (!g) return null
  const color =
    g.tone === "good" ? "text-emerald-600" : g.tone === "bad" ? "text-amber-500" : "text-muted-foreground"
  return <span className={`ml-1 text-xs font-semibold ${color}`}>{g.symbol}</span>
}

/** “Your last 30 days” — right-hand column on the staff home dashboard. */
export function StaffDashboardPerformanceCard({
  perf,
  loading,
}: {
  perf: StaffDashboardPerformance | null
  loading: boolean
}) {
  const router = useRouter()
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <ul className="mt-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-border/60 pb-3 last:border-0">
              <Skeleton className="h-9 w-14" />
              <div className="flex-1 space-y-2 text-right">
                <Skeleton className="ml-auto h-4 w-28" />
                <Skeleton className="ml-auto h-3 w-20" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (!perf) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Performance stats unavailable.
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-primary">Your last 30 days</h3>
      <ul className="mt-4 space-y-4 text-sm">
        <li className="flex justify-between gap-2 border-b border-border/60 pb-3">
          <span className="text-3xl font-bold tabular-nums text-primary">
            {perf.averageCompleteness30d}%
          </span>
          <div className="text-right">
            <p className="font-medium text-foreground">Avg completeness</p>
            <p className="text-xs text-muted-foreground">
              vs {perf.averageCompleteness30dPrev}%
              <TrendPill
                current={perf.averageCompleteness30d}
                prev={perf.averageCompleteness30dPrev}
                higherIsBetter
              />
            </p>
          </div>
        </li>
        <li className="flex justify-between gap-2 border-b border-border/60 pb-3">
          <span className="text-3xl font-bold tabular-nums text-primary">{perf.totalReports30d}</span>
          <div className="text-right">
            <p className="font-medium text-foreground">Reports submitted</p>
            <p className="text-xs text-muted-foreground">Your count (rolling)</p>
          </div>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-3xl font-bold tabular-nums text-primary">{perf.currentStreak}</span>
          <div className="text-right">
            <p className="font-medium text-foreground">Streak (85%+)</p>
            <p className="text-xs text-muted-foreground">Best: {perf.bestStreak}</p>
          </div>
        </li>
      </ul>
      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full min-h-11"
        onClick={() => router.push("/staff/intelligence")}
      >
        <Lightbulb className="mr-2 h-4 w-4" />
        Full analysis
      </Button>
    </div>
  )
}
