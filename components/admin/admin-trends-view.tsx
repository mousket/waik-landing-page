"use client"

import { useCallback } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { AdminTrendsComplianceDriftCard } from "@/components/admin/admin-trends-compliance-drift-card"
import { AdminTrendsFacilityHealthCard } from "@/components/admin/admin-trends-facility-health-card"
import { AdminTrendsIncidentTrendsCard } from "@/components/admin/admin-trends-incident-trends-card"
import { AdminTrendsHighRiskCohortCard } from "@/components/admin/admin-trends-high-risk-cohort-card"
import { AdminTrendsInterventionEffectivenessCard } from "@/components/admin/admin-trends-intervention-effectiveness-card"
import { AdminTrendsPatternInsightsCard } from "@/components/admin/admin-trends-pattern-insights-card"
import { AdminTrendsStaffingThroughputCard } from "@/components/admin/admin-trends-staffing-throughput-card"
import {
  type TrendsRangeKey,
  computeTrendsPeriodWindows,
  trendsRangeDayCount,
} from "@/lib/admin/trends-range"
import { Button } from "@/components/ui/button"

const RANGE_OPTIONS: TrendsRangeKey[] = ["7d", "30d", "90d"]

const RANGE_TRIGGER_BASE =
  "h-9 shrink-0 rounded-xl border px-3 text-xs font-semibold transition-all sm:text-sm"

const RANGE_TRIGGER_ACTIVE =
  "border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 text-primary shadow-md sm:shadow-lg"

const RANGE_TRIGGER_IDLE =
  "border-transparent text-foreground/90 hover:bg-muted/40 hover:text-foreground"

/** Matches dashboard view tabs: compact pill, no “selected” state (navigation only). */
const JUMP_CHIP_CLASS =
  "h-8 shrink-0 rounded-xl border border-border/50 bg-background/50 px-2.5 text-xs font-semibold text-foreground/90 shadow-sm outline-none transition-all hover:border-primary/25 hover:bg-gradient-to-b hover:from-primary/10 hover:to-primary/5 hover:text-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-9 sm:px-3 sm:text-sm"

function formatWindowLabel(start: Date, end: Date): string {
  const sameMonth = format(start, "MMM yyyy") === format(end, "MMM yyyy")
  if (sameMonth) {
    return `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`
  }
  return `${format(start, "MMM d, yyyy")}–${format(end, "MMM d, yyyy")}`
}

const JUMP_CHIPS: { targetId: string; label: string }[] = [
  { targetId: "trends-e3", label: "Incidents" },
  { targetId: "trends-e4", label: "Compliance" },
  { targetId: "trends-e5", label: "Patterns" },
  { targetId: "trends-e6", label: "Risk cohort" },
  { targetId: "trends-e8", label: "Staffing" },
]

export function AdminTrendsView({
  trendsRange,
  onTrendsRangeChange,
  searchParams,
  facilityId,
  now = new Date(),
}: {
  trendsRange: TrendsRangeKey
  onTrendsRangeChange: (next: TrendsRangeKey) => void
  searchParams: URLSearchParams
  facilityId?: string
  /** Injected for tests; defaults to real time. */
  now?: Date
}) {
  const { current, previous } = computeTrendsPeriodWindows(now, trendsRange)
  const days = trendsRangeDayCount(trendsRange)

  const scrollToTrendsSection = useCallback((elementId: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <div className="flex min-h-0 w-full flex-col gap-6">
      <section
        id="trends-e1"
        className="scroll-mt-24 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 p-4 shadow-sm sm:p-5"
        aria-label="Trends header"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trends</p>
            <p className="text-sm font-semibold text-foreground">Compared to previous period</p>
            <p className="text-xs text-muted-foreground">
              Baseline: {formatWindowLabel(previous.start, previous.end)} · Current ({days}d):{" "}
              {formatWindowLabel(current.start, current.end)}.
            </p>
          </div>
          <div
            className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:gap-2 sm:p-2"
            role="group"
            aria-label="Date range"
          >
            {RANGE_OPTIONS.map((key) => {
              const active = trendsRange === key
              return (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(RANGE_TRIGGER_BASE, active ? RANGE_TRIGGER_ACTIVE : RANGE_TRIGGER_IDLE)}
                  onClick={() => onTrendsRangeChange(key)}
                >
                  {key === "7d" ? "7d" : key === "30d" ? "30d" : "90d"}
                </Button>
              )
            })}
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4" aria-label="Jump to trend modules">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Jump to</p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {JUMP_CHIPS.map(({ targetId, label }) => (
              <button
                key={targetId}
                type="button"
                className={JUMP_CHIP_CLASS}
                onClick={() => scrollToTrendsSection(targetId)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </section>

      <section id="trends-e2" className="scroll-mt-24 min-w-0" aria-label="Facility health summary">
        <AdminTrendsFacilityHealthCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>

      <section id="trends-e3" className="scroll-mt-24 min-w-0" aria-label="Incident trends">
        <AdminTrendsIncidentTrendsCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>

      <section id="trends-e4" className="scroll-mt-24 min-w-0" aria-label="Compliance drift">
        <AdminTrendsComplianceDriftCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>

      <section id="trends-e5" className="scroll-mt-24 min-w-0" aria-label="Pattern insights">
        <AdminTrendsPatternInsightsCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>

      <section id="trends-e6" className="scroll-mt-24 min-w-0" aria-label="High-risk cohort trends">
        <AdminTrendsHighRiskCohortCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>

      <section id="trends-e7" className="scroll-mt-24 min-w-0" aria-label="Intervention effectiveness">
        <AdminTrendsInterventionEffectivenessCard
          trendsRange={trendsRange}
          searchParams={searchParams}
          facilityId={facilityId}
        />
      </section>

      <section id="trends-e8" className="scroll-mt-24 min-w-0" aria-label="Staffing and throughput">
        <AdminTrendsStaffingThroughputCard trendsRange={trendsRange} searchParams={searchParams} facilityId={facilityId} />
      </section>
    </div>
  )
}
