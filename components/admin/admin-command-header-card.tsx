"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  dailyCommandAttentionQueueHref,
  dailyCommandIncidentsListHref,
  DailyCommandIncidentsQuery,
} from "@/lib/admin/daily-command-drilldowns"
import { computeDailyCommandSnapshotHeader } from "@/lib/admin/daily-command-snapshot-header"
import { cn } from "@/lib/utils"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"

function firstNameFromDisplay(userDisplayName: string) {
  return userDisplayName.trim().split(/\s+/)[0] || "there"
}

function salutationFromHour(h: number): string {
  if (h >= 4 && h < 12) return "Good morning"
  if (h >= 12 && h < 18) return "Good afternoon"
  return "Good evening"
}

function scrollToAnchor(id: string) {
  if (typeof document === "undefined") return
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

const CHIP_BASE =
  "inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors sm:min-h-10 sm:text-sm"

const SHORTCUT_BTN =
  "rounded-full border border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/25 hover:from-primary/10 hover:to-primary/5 hover:text-primary"

export function AdminCommandHeaderCard({
  userDisplayName,
  effectiveFacilityId,
  incidents,
  incidentsLoading,
  snapshotError,
  stats,
  statsLoading,
  statsFetchError,
  searchParams,
  scopeHealthLine,
}: {
  userDisplayName: string
  effectiveFacilityId?: string
  incidents: IncidentSummary[]
  incidentsLoading: boolean
  /** When set (and not loading), incident-derived chips are hidden — empty `incidents` is not “all clear”. */
  snapshotError?: string | null
  stats: DashboardStats | null
  statsLoading: boolean
  statsFetchError?: string | null
  searchParams: URLSearchParams
  scopeHealthLine?: string | null
}) {
  const first = firstNameFromDisplay(userDisplayName)
  const [greet, setGreet] = useState("Hello")
  const [facilityName, setFacilityName] = useState<string | null>(null)

  useEffect(() => {
    setGreet(salutationFromHour(new Date().getHours()))
  }, [])

  useEffect(() => {
    const id = (effectiveFacilityId || "").trim()
    if (!id) {
      setFacilityName(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const org = (searchParams.get("organizationId") || "").trim()
        const url = org
          ? `/api/facilities?organizationId=${encodeURIComponent(org)}`
          : "/api/facilities"
        const res = await fetch(url, { credentials: "include" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { facilities?: { id: string; name: string }[] }
        const list = Array.isArray(data.facilities) ? data.facilities : []
        const hit = list.find((f) => f.id === id)
        if (!cancelled) setFacilityName(hit?.name?.trim() || null)
      } catch {
        if (!cancelled) setFacilityName(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [effectiveFacilityId, searchParams])

  const metrics = useMemo(
    () => computeDailyCommandSnapshotHeader(incidents, stats, statsLoading),
    [incidents, stats, statsLoading],
  )

  const criticalHref = dailyCommandIncidentsListHref(searchParams, {
    range: DailyCommandIncidentsQuery.rangeToday,
    severity: DailyCommandIncidentsQuery.severityCritical,
  })
  const overdueHref = dailyCommandIncidentsListHref(searchParams, {
    range: DailyCommandIncidentsQuery.rangeToday,
    bottleneck: DailyCommandIncidentsQuery.bottleneckOverdueDocs,
  })
  const todayHref = dailyCommandIncidentsListHref(searchParams, {
    range: DailyCommandIncidentsQuery.rangeToday,
  })
  const attentionHref = dailyCommandAttentionQueueHref(searchParams)

  const protectionLabel =
    metrics.protection === "protected" ? "Protected" : metrics.protection === "at_risk" ? "At risk" : "Exposed"

  const protectionChipClass =
    metrics.protection === "protected"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
      : metrics.protection === "at_risk"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        : "border-destructive/35 bg-destructive/10 text-destructive"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/25 via-card/80 to-card/40 p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/[0.06] blur-2xl" aria-hidden />
      <div className="relative space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Command snapshot</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {greet}, {first}
          </h2>
          <p className="text-sm text-muted-foreground">
            {facilityName ? (
              <>
                Facility scope: <span className="font-medium text-foreground">{facilityName}</span>
              </>
            ) : effectiveFacilityId ? (
              <>Facility scope: selected facility</>
            ) : (
              <>Select a facility to load today&apos;s command signals.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {incidentsLoading ? (
            <>
              <Skeleton className="h-9 w-[7.5rem] rounded-full sm:h-10" />
              <Skeleton className="h-9 w-[7.5rem] rounded-full sm:h-10" />
              <Skeleton className="h-9 w-[8.5rem] rounded-full sm:h-10" />
              <Skeleton className="h-9 w-[8rem] rounded-full sm:h-10" />
              <Skeleton className="h-9 w-[6.5rem] rounded-full sm:h-10" />
            </>
          ) : snapshotError ? (
            <p className="max-w-xl rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Incident snapshot unavailable — chips stay hidden so we don&apos;t imply a clear queue. Use{" "}
              <span className="font-semibold text-foreground/90">Retry</span> in the notice above.
            </p>
          ) : (
            <>
              <Link
                href={criticalHref}
                className={cn(
                  CHIP_BASE,
                  "border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/15",
                )}
              >
                Critical open{" "}
                <span className="tabular-nums text-[11px] opacity-90 sm:text-xs">{metrics.criticalOpen}</span>
              </Link>
              <Link
                href={overdueHref}
                className={cn(
                  CHIP_BASE,
                  "border-amber-500/35 bg-amber-500/10 text-amber-950 hover:border-amber-500/55 hover:bg-amber-500/15 dark:text-amber-100",
                )}
              >
                Overdue docs{" "}
                <span className="tabular-nums text-[11px] opacity-90 sm:text-xs">{metrics.overdueDocs}</span>
              </Link>
              <Link
                href={todayHref}
                className={cn(
                  CHIP_BASE,
                  "border-border/70 bg-muted/30 text-foreground hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                Incidents today{" "}
                <span className="tabular-nums text-[11px] opacity-90 sm:text-xs">{metrics.incidentsToday}</span>
              </Link>
              {metrics.protection === "protected" ? (
                <Collapsible>
                  <CollapsibleTrigger
                    className={cn(
                      CHIP_BASE,
                      "cursor-pointer border-dashed text-left",
                      protectionChipClass,
                    )}
                  >
                    <span>{protectionLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    No injury-flagged or clock-critical items are in the immediate queue from this snapshot. Keep
                    monitoring Phase 2 clocks and IDT responses as work arrives.
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Link href={attentionHref} className={cn(CHIP_BASE, protectionChipClass)}>
                  {protectionLabel}
                </Link>
              )}
            </>
          )}
        </div>

        {statsFetchError && !statsLoading && !snapshotError ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            30-day stats did not load ({statsFetchError}). Retry refreshes stats as well.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
          <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Jump</span>
          <button type="button" className={SHORTCUT_BTN} onClick={() => scrollToAnchor("dc-a2")}>
            Criticals
          </button>
          <button type="button" className={SHORTCUT_BTN} onClick={() => scrollToAnchor("dc-a4")}>
            Docs
          </button>
          <button type="button" className={SHORTCUT_BTN} onClick={() => scrollToAnchor("dc-a5")}>
            Incidents
          </button>
          <button type="button" className={SHORTCUT_BTN} onClick={() => scrollToAnchor("dc-a6")}>
            Risk residents
          </button>
          <button type="button" className={SHORTCUT_BTN} onClick={() => scrollToAnchor("dc-a7")}>
            Staff
          </button>
        </div>

        {scopeHealthLine ? (
          <p className="border-t border-border/40 pt-3 text-xs font-medium leading-relaxed text-foreground/85">
            {scopeHealthLine}
          </p>
        ) : null}
      </div>
    </div>
  )
}
