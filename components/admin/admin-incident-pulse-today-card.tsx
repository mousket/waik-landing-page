"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { classifyIncident } from "@/lib/utils/incident-classification"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function isSameLocalCalendarDay(iso: string, now = new Date()): boolean {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return false
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  )
}

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function sameResident(a: IncidentSummary, b: IncidentSummary): boolean {
  const n = (a.residentName || "").trim() === (b.residentName || "").trim()
  const r = (a.residentRoom || "").trim() === (b.residentRoom || "").trim()
  return n && r && Boolean((a.residentName || "").trim())
}

function isRepeatWithin7Days(inc: IncidentSummary, all: IncidentSummary[]): boolean {
  const start = new Date(inc.startedAt).getTime()
  if (Number.isNaN(start)) return false
  const windowStart = start - 7 * 24 * 60 * 60 * 1000
  return all.some((o) => {
    if (o.id === inc.id) return false
    if (!sameResident(o, inc)) return false
    const t = new Date(o.startedAt).getTime()
    return !Number.isNaN(t) && t >= windowStart && t < start
  })
}

function localHour(iso: string): number {
  return new Date(iso).getHours()
}

function formatHourRange(h: number): string {
  const end = (h + 1) % 24
  const label = (x: number) => (x === 0 ? "12am" : x < 12 ? `${x}am` : x === 12 ? "12pm" : `${x - 12}pm`)
  return `${label(h)}–${label(end)}`
}

const SEVERITY_CHIP =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors sm:text-sm"

export function AdminIncidentPulseTodayCard({
  incidents,
  incidentsLoading,
  snapshotError,
  searchParams,
}: {
  incidents: IncidentSummary[]
  incidentsLoading: boolean
  snapshotError?: string | null
  searchParams: URLSearchParams
}) {
  const model = useMemo(() => {
    const nowMs = Date.now()
    const today = incidents.filter((i) => isSameLocalCalendarDay(i.startedAt))

    let critical = 0
    let warning = 0
    let normal = 0
    for (const inc of today) {
      const u = classifyIncident(inc, nowMs)
      if (u === "red_alert") critical += 1
      else if (u === "yellow_awaiting") warning += 1
      else normal += 1
    }

    const typeCounts = new Map<string, number>()
    for (const inc of today) {
      const k = inc.incidentType || "unknown"
      typeCounts.set(k, (typeCounts.get(k) ?? 0) + 1)
    }
    const types = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    let repeatCount = 0
    for (const inc of today) {
      if (isRepeatWithin7Days(inc, incidents)) repeatCount += 1
    }

    const byHour = new Map<number, number>()
    for (const inc of today) {
      const h = localHour(inc.startedAt)
      byHour.set(h, (byHour.get(h) ?? 0) + 1)
    }
    let peakHour: number | null = null
    let peakN = 0
    for (const [h, n] of byHour) {
      if (n > peakN) {
        peakN = n
        peakHour = h
      }
    }
    const notable =
      peakHour !== null && peakN >= 2
        ? { n: peakN, hour: peakHour, label: formatHourRange(peakHour) }
        : null

    return {
      todayCount: today.length,
      critical,
      warning,
      normal,
      types,
      repeatCount,
      notable,
    }
  }, [incidents])

  const repeatHref = buildAdminPathWithContext("/admin/incidents?range=today&repeat=1", searchParams)
  const todayListHref = buildAdminPathWithContext("/admin/incidents?range=today", searchParams)

  if (incidentsLoading) {
    return (
      <section
        id="dc-a5"
        className="scroll-mt-24 min-h-[200px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="Incident pulse today"
      >
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="mt-4 h-10 w-full rounded-xl" />
        <Skeleton className="mt-2 h-10 w-full rounded-xl" />
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a5"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="Incident pulse today"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Incident pulse</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[160px]" />
      </section>
    )
  }

  return (
    <section
      id="dc-a5"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="Incident pulse today"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Incident pulse</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Started today (local) · {model.todayCount} new report{model.todayCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={todayListHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
        >
          Today list
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {model.todayCount === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Quiet start today (local time). Anything already in motion stays in the open pipeline — scroll to{" "}
          <span className="font-medium text-foreground/90">Open investigations</span> for the full list.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={buildAdminPathWithContext("/admin/incidents?range=today&severity=critical", searchParams)}
              className={cn(
                SEVERITY_CHIP,
                "border-destructive/35 bg-destructive/10 text-destructive hover:border-destructive/50",
              )}
            >
              Critical <span className="tabular-nums opacity-90">{model.critical}</span>
            </Link>
            <Link
              href={buildAdminPathWithContext("/admin/incidents?range=today&severity=warning", searchParams)}
              className={cn(
                SEVERITY_CHIP,
                "border-amber-500/40 bg-amber-500/10 text-amber-950 hover:border-amber-500/60 dark:text-amber-100",
              )}
            >
              Warning <span className="tabular-nums opacity-90">{model.warning}</span>
            </Link>
            <Link
              href={buildAdminPathWithContext("/admin/incidents?range=today&severity=normal", searchParams)}
              className={cn(
                SEVERITY_CHIP,
                "border-border/70 bg-muted/30 text-foreground hover:border-primary/30",
              )}
            >
              Normal <span className="tabular-nums opacity-90">{model.normal}</span>
            </Link>
          </div>

          {model.types.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">By type</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {model.types.map(([typeKey, count]) => (
                  <li key={typeKey}>
                    <Link
                      href={buildAdminPathWithContext(
                        `/admin/incidents?range=today&type=${encodeURIComponent(typeKey)}`,
                        searchParams,
                      )}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/35 hover:bg-primary/5 sm:text-xs"
                    >
                      <span>{formatIncidentType(typeKey)}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Repeats within 7 days</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Same resident had another open-pipeline report in the prior week (best-effort from this list).
              </p>
            </div>
            <Link
              href={repeatHref}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/12",
              )}
            >
              {model.repeatCount} flagged
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {model.notable ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">Notable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {model.notable.n} events clustered in the{" "}
                <Link href={todayListHref} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {model.notable.label}
                </Link>{" "}
                window (local time). Open the today list to review.
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
