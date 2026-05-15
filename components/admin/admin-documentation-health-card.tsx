"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import { DailyCommandSnapshotUnavailable } from "@/components/admin/daily-command-snapshot-unavailable"
import { computeClock, isIdtOverdue } from "@/lib/utils/incident-classification"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function isSameLocalCalendarDay(iso: string, now = new Date()): boolean {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return false
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  )
}

function unitKeyFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "Unknown"
  const wing = r.split(/[-/]/)[0]?.trim()
  if (wing && wing.length <= 8) return wing
  const first = r.split(/\s+/)[0]?.trim()
  return first || r.slice(0, 6)
}

function scoreForIncident(inc: IncidentSummary, nowMs: number): number {
  const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
  let s = 0
  if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") {
    s = Math.max(s, 1_000_000 + Math.abs(clock.hoursRemaining) * 3_600_000)
  }
  if (inc.phase === "phase_2_in_progress") {
    for (const m of inc.idtTeam) {
      if (!isIdtOverdue(m, nowMs) || !m.questionSentAt) continue
      const sent = new Date(m.questionSentAt).getTime()
      const hrs = (nowMs - sent) / (1000 * 60 * 60)
      s = Math.max(s, 500_000 + hrs * 100_000)
    }
  }
  return s
}

function incidentDocOverdue(inc: IncidentSummary, nowMs: number): boolean {
  const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
  if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") return true
  return incidentHasOverdueIdt(inc, nowMs)
}

function completenessOf(inc: IncidentSummary): number {
  return Math.round(inc.completenessScore ?? inc.completenessAtSignoff ?? 0)
}

function ownerForDoc(inc: IncidentSummary): string {
  return inc.investigatorName?.trim() || inc.reportedByName?.trim() || "Unassigned"
}

type CauseKey = "missing_followup_note" | "missing_witness_statement" | "regulatory_clock"

const CAUSE_LABEL: Record<CauseKey, string> = {
  missing_followup_note: "Missing follow-up (IDT)",
  missing_witness_statement: "Low Phase 1 completeness",
  regulatory_clock: "Phase 2 clock past 48h",
}

export function AdminDocumentationHealthCard({
  incidents,
  incidentsLoading,
  snapshotError,
  searchParams,
  stats,
  statsLoading,
  statsFetchError,
}: {
  incidents: IncidentSummary[]
  incidentsLoading: boolean
  snapshotError?: string | null
  searchParams: URLSearchParams
  stats: DashboardStats | null
  statsLoading: boolean
  statsFetchError?: string | null
}) {
  const model = useMemo(() => {
    const nowMs = Date.now()
    const open = incidents
    const today = open.filter((i) => isSameLocalCalendarDay(i.startedAt))

    const avg = (list: IncidentSummary[]) =>
      list.length === 0 ? null : Math.round(list.reduce((s, i) => s + completenessOf(i), 0) / list.length)

    const overallOpen = avg(open)
    const todayAvg = avg(today)

    const unitMap = new Map<string, { sum: number; n: number }>()
    for (const inc of open) {
      const u = unitKeyFromRoom(inc.residentRoom || "")
      const prev = unitMap.get(u) ?? { sum: 0, n: 0 }
      prev.sum += completenessOf(inc)
      prev.n += 1
      unitMap.set(u, prev)
    }
    const unitRows = [...unitMap.entries()]
      .map(([unit, { sum, n }]) => ({ unit, avg: Math.round(sum / n), n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)

    const overdueIncidents = open.filter((i) => incidentDocOverdue(i, nowMs))
    const overdueCount = overdueIncidents.length

    const causes: Record<CauseKey, number> = {
      missing_followup_note: 0,
      missing_witness_statement: 0,
      regulatory_clock: 0,
    }
    for (const inc of open) {
      if (incidentHasOverdueIdt(inc, nowMs)) causes.missing_followup_note += 1
      const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
      if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") causes.regulatory_clock += 1
      if (inc.phase === "phase_1_in_progress" && completenessOf(inc) < 50) causes.missing_witness_statement += 1
    }
    const topCauses = (Object.entries(causes) as [CauseKey, number][])
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)

    let oldest: IncidentSummary | null = null
    let oldestScore = 0
    for (const inc of open) {
      const sc = scoreForIncident(inc, nowMs)
      if (sc === 0) continue
      if (
        sc > oldestScore ||
        (sc === oldestScore && oldest && new Date(inc.startedAt) < new Date(oldest.startedAt))
      ) {
        oldestScore = sc
        oldest = inc
      }
    }

    let oldestAgeLabel = ""
    if (oldest) {
      const clock = computeClock(oldest.phase1SignedAt, 48, nowMs)
      if (oldest.phase === "phase_2_in_progress" && clock?.status === "overdue") {
        oldestAgeLabel = clock.label
      } else if (incidentHasOverdueIdt(oldest, nowMs)) {
        oldestAgeLabel = "IDT follow-up overdue"
      }
    }

    const microGaps = open
      .filter((i) => i.phase === "phase_1_in_progress")
      .filter((i) => {
        const c = completenessOf(i)
        return c >= 55 && c <= 78
      })
      .sort((a, b) => completenessOf(a) - completenessOf(b))
      .slice(0, 3)

    return {
      overallOpen,
      todayAvg,
      todayCount: today.length,
      unitRows,
      overdueCount,
      topCauses,
      oldest,
      oldestAgeLabel,
      microGaps,
    }
  }, [incidents])

  const overdueListHref = buildAdminPathWithContext(
    "/admin/incidents?range=today&bottleneck=overdue_docs",
    searchParams,
  )

  if (incidentsLoading) {
    return (
      <section
        id="dc-a4"
        className="scroll-mt-24 min-h-[260px] rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-busy="true"
        aria-label="Documentation health"
      >
        <Skeleton className="h-5 w-52 rounded-md" />
        <Skeleton className="mt-4 h-16 w-full rounded-xl" />
        <Skeleton className="mt-3 h-12 w-full rounded-xl" />
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
      </section>
    )
  }

  if (snapshotError) {
    return (
      <section
        id="dc-a4"
        className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
        aria-label="Documentation health"
      >
        <div className="border-b border-border/40 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentation health</h2>
        </div>
        <DailyCommandSnapshotUnavailable message={snapshotError} className="mt-4" minHeightClass="min-h-[200px]" />
      </section>
    )
  }

  return (
    <section
      id="dc-a4"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/15 to-card/50 p-4 shadow-sm sm:p-5"
      aria-label="Documentation health"
    >
      <div className="border-b border-border/40 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentation health</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Open pipeline snapshot (not calendar-gated) — list filters arrive with task 5c1-10.
        </p>
      </div>

      {statsFetchError && !statsLoading ? (
        <p className="mt-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          30-day community stats did not load ({statsFetchError}). Use Retry above — incident tiles below still reflect the
          open pipeline.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open pipeline avg</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {model.overallOpen === null ? "—" : `${model.overallOpen}%`}
          </p>
          {model.todayCount > 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Started today: {model.todayAvg === null ? "—" : `${model.todayAvg}%`} · {model.todayCount} report
              {model.todayCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">No new reports started today yet.</p>
          )}
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Community (30d)</p>
          {statsLoading ? (
            <Skeleton className="mt-2 h-8 w-20 rounded-md" />
          ) : stats ? (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{stats.avgCompleteness30d}%</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Average completeness on signed reports (cached stats).</p>
        </div>
      </div>

      {model.unitRows.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">By unit / wing</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Derived from room codes (first segment).</p>
          <ul className="mt-2 space-y-2">
            {model.unitRows.map((row) => {
              const href = buildAdminPathWithContext(
                `/admin/incidents?range=today&unit=${encodeURIComponent(row.unit)}`,
                searchParams,
              )
              const w = Math.min(100, Math.max(8, row.avg))
              return (
                <li key={row.unit}>
                  <Link
                    href={href}
                    className="group block rounded-lg border border-transparent px-1 py-0.5 hover:border-border/60 hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-foreground group-hover:text-primary">{row.unit}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.avg}% · {row.n} open
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary/80"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
            Documentation overdue
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{model.overdueCount}</p>
          {model.topCauses.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {model.topCauses.map(([key, count]) => (
                <li key={key}>
                  <Link href={overdueListHref} className="hover:text-primary hover:underline">
                    {CAUSE_LABEL[key]} — {count}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">No ranked causes in this snapshot.</p>
          )}
        </div>
        <Link
          href={overdueListHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          Queue
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {model.oldest ? (
        <div className="mt-4 rounded-xl border border-border/50 bg-card/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Oldest overdue</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">{model.oldest.residentName || "Unknown"}</p>
              <p className="text-[11px] text-muted-foreground">
                {model.oldestAgeLabel || "Overdue"} · Owner {ownerForDoc(model.oldest)}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="h-9 w-full shrink-0 sm:h-8 sm:w-auto">
              <Link
                href={buildAdminPathWithContext(
                  `/admin/incidents/${encodeURIComponent(model.oldest.id)}`,
                  searchParams,
                )}
                className="inline-flex items-center justify-center gap-1 font-semibold"
              >
                Open
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No documentation overdue in this snapshot.</p>
      )}

      {model.microGaps.length > 0 ? (
        <div className="mt-4 border-t border-border/40 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resolve fastest wins</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Phase 1 reports in the 55–78% completeness band.</p>
          <ul className="mt-2 space-y-2">
            {model.microGaps.map((inc) => (
              <li key={inc.id}>
                <Link
                  href={buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px] hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">{inc.residentName || inc.id}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{completenessOf(inc)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
