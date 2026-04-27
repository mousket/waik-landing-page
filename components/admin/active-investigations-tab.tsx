"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { buildAdminIncidentsApiPath, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { computeClock, type ClockState } from "@/lib/utils/incident-classification"
import type { IncidentSummary } from "@/lib/types/incident-summary"

type PhaseFilter = "all" | "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress"

const RED = "#C0392B"
const AMBER = "#E8A838"

type SortKey = "date" | "completeness" | "hours"

const FILTERS: { key: PhaseFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "phase_1_in_progress", label: "Phase 1 In Progress" },
  { key: "phase_1_complete", label: "Phase 1 Complete" },
  { key: "phase_2_in_progress", label: "Phase 2 In Progress" },
]

const TYPE_LABELS: Record<string, string> = {
  fall: "Fall",
  medication_error: "Medication Error",
  resident_conflict: "Resident Conflict",
  wound_injury: "Wound / Injury",
  abuse_neglect: "Abuse / Neglect",
}

function displayIncidentType(raw: string): string {
  const k = raw.toLowerCase().replace(/\s+/g, "_")
  if (TYPE_LABELS[k]) return TYPE_LABELS[k]
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function hoursSortKey(clock: ClockState | null): number {
  if (!clock) return Number.POSITIVE_INFINITY
  return clock.hoursRemaining
}

function PhaseBadge({ phase }: { phase: IncidentSummary["phase"] }) {
  if (phase === "phase_1_in_progress") {
    return <Badge className="border-0 bg-amber-500/90 font-medium text-white">Phase 1 Active</Badge>
  }
  if (phase === "phase_1_complete") {
    return <Badge className="border-0 bg-amber-400 font-medium text-foreground">Phase 1 Complete</Badge>
  }
  if (phase === "phase_2_in_progress") {
    return <Badge className="border-0 bg-sky-600 font-medium text-white">Phase 2 Active</Badge>
  }
  if (phase === "closed") {
    return <Badge variant="secondary">Closed</Badge>
  }
  return <Badge variant="outline">{phase}</Badge>
}

function CompletenessRing({ pct, diameter = 44 }: { pct: number; diameter?: number }) {
  const stroke = 2
  const r = (diameter - stroke) / 2
  const cx = diameter / 2
  const cy = diameter / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const dashOffset = c * (1 - clamped / 100)

  return (
    <div className="relative shrink-0" style={{ width: diameter, height: diameter }}>
      <svg width={diameter} height={diameter} className="-rotate-90 pointer-events-none" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-border" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-primary"
          strokeWidth={stroke}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[11px] font-bold tabular-nums text-primary leading-none sm:text-sm">
        {clamped}%
      </span>
    </div>
  )
}

function ClockDisplay({ clock }: { clock: ClockState | null }) {
  if (!clock) {
    return <span className="text-sm tabular-nums text-muted-foreground">—</span>
  }
  const { status, label } = clock
  if (status === "gray") {
    return <span className="text-sm tabular-nums text-muted-foreground">{label}</span>
  }
  if (status === "amber") {
    return (
      <span className="text-sm font-medium tabular-nums" style={{ color: AMBER }}>
        {label}
      </span>
    )
  }
  if (status === "red") {
    return (
      <span className="text-sm font-bold tabular-nums" style={{ color: RED }}>
        {label}
      </span>
    )
  }
  return (
    <span className="text-sm font-bold italic tabular-nums" style={{ color: RED }}>
      {label}
    </span>
  )
}

type RowModel = IncidentSummary & { clock: ClockState | null }

export function ActiveInvestigationsTab({
  onActiveCount,
  sharedIncidents,
  sharedLoading,
  useParentList = false,
}: {
  onActiveCount: (n: number) => void
  /** When provided, parent owns fetch/poll — avoids duplicate GET with Needs Attention (task-06g). */
  sharedIncidents?: IncidentSummary[]
  sharedLoading?: boolean
  /**
   * When true, never call `/api/incidents` from this tab. Parent is the only source of truth.
   * Prevents a duplicate request that can omit `facilityId` in the URL before the super-admin
   * facility context is ready (and matches NeedsAttentionTab’s explicit parentMode pattern).
   */
  useParentList?: boolean
}) {
  const searchParams = useAdminUrlSearchParams()
  const [internalRaw, setInternalRaw] = useState<IncidentSummary[]>([])
  const [internalLoading, setInternalLoading] = useState(true)
  const [internalListError, setInternalListError] = useState<string | null>(null)
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("phase_2_in_progress")
  const [sortKey, setSortKey] = useState<SortKey>("hours")

  const usesParentList = useParentList
  const raw = useMemo(
    () => (usesParentList ? (sharedIncidents ?? []) : internalRaw),
    [usesParentList, sharedIncidents, internalRaw],
  )
  const loading = usesParentList ? Boolean(sharedLoading) : internalLoading

  const incidentsListUrl = useMemo(
    () =>
      buildAdminIncidentsApiPath(searchParams, {
        phase: "phase_1_in_progress,phase_1_complete,phase_2_in_progress",
      }),
    [searchParams],
  )

  const load = useCallback(async () => {
    setInternalLoading(true)
    setInternalListError(null)
    try {
      const res = await fetch(incidentsListUrl, { credentials: "include" })
      if (!res.ok) {
        const { message } = await readApiErrorMessage(res, "Could not load active investigations")
        setInternalListError(message)
        setInternalRaw([])
        return
      }
      setInternalListError(null)
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setInternalRaw(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      setInternalListError("Network error while loading active investigations.")
      setInternalRaw([])
    } finally {
      setInternalLoading(false)
    }
  }, [incidentsListUrl])

  useEffect(() => {
    if (usesParentList) return
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(id)
  }, [usesParentList, load])

  const phase2Total = useMemo(() => raw.filter((i) => i.phase === "phase_2_in_progress").length, [raw])

  useEffect(() => {
    onActiveCount(phase2Total)
  }, [phase2Total, onActiveCount])

  const rows = useMemo(() => {
    const list = raw.filter((inc) => {
      if (phaseFilter === "all") return true
      return inc.phase === phaseFilter
    })

    const withClock: RowModel[] = list.map((inc) => ({
      ...inc,
      clock: computeClock(inc.phase1SignedAt),
    }))

    const sorted = [...withClock].sort((a, b) => {
      if (sortKey === "hours") {
        return hoursSortKey(a.clock) - hoursSortKey(b.clock)
      }
      if (sortKey === "completeness") {
        return (b.completenessAtSignoff ?? 0) - (a.completenessAtSignoff ?? 0)
      }
      const ta = new Date(a.startedAt).getTime()
      const tb = new Date(b.startedAt).getTime()
      return tb - ta
    })

    return sorted
  }, [raw, phaseFilter, sortKey])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} className="h-[148px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!usesParentList && internalListError ? (
        <div
          className="rounded-lg border border-red-200/90 bg-red-50/90 p-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Could not load active investigations</p>
          <p className="mt-1 text-red-800/90">{internalListError}</p>
        </div>
      ) : null}
      <div className="sticky top-0 z-20 -mx-1 mb-1 flex flex-col gap-2 rounded-lg border border-border/60 bg-card/90 px-2 py-2 shadow-sm backdrop-blur-md sm:-mx-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-3">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {FILTERS.map(({ key, label }) => {
            const active = phaseFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPhaseFilter(key)}
                className={cn(
                  "min-h-9 rounded-full px-2.5 text-xs font-medium transition-colors sm:min-h-9 sm:px-3 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground ring-1 ring-border hover:bg-muted/50",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <span className="shrink-0 font-medium text-foreground">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground shadow-sm sm:max-w-[220px] sm:text-sm"
          >
            <option value="date">Date (newest first)</option>
            <option value="completeness">Completeness (high first)</option>
            <option value="hours">Hours remaining (urgent first)</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No incidents match this filter.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((inc) => {
            const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
            return (
              <div
                key={inc.id}
                className="group flex min-h-0 flex-col rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold leading-tight text-primary">Rm {inc.residentRoom}</p>
                  <PhaseBadge phase={inc.phase} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                  {displayIncidentType(inc.incidentType)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                  <div className="flex items-center gap-2">
                    <CompletenessRing pct={pct} />
                  </div>
                  <div className="min-w-0 text-right text-xs">
                    <ClockDisplay clock={inc.clock} />
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="mt-2.5 h-9 w-full min-h-0 gap-1 border border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  <Link href={buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)}>
                    Open
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100" aria-hidden />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
