"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { buildAdminIncidentsApiPath, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { IncidentSummary } from "@/lib/types/incident-summary"

type PhaseFilter = "all" | "phase_1_in_progress" | "phase_1_complete" | "phase_2_in_progress"
import { computeClock, type ClockState } from "@/lib/utils/incident-classification"

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

function CompletenessRing({ pct, diameter = 40 }: { pct: number; diameter?: number }) {
  const stroke = 3
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
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[10px] font-semibold tabular-nums text-primary sm:text-xs">
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
          <Skeleton className="h-10 w-16 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <Skeleton className="h-10 w-48 rounded-md" />
        {[0, 1, 2].map((k) => (
          <Skeleton key={k} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!usesParentList && internalListError ? (
        <div
          className="rounded-lg border border-red-200/90 bg-red-50/90 p-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Could not load active investigations</p>
          <p className="mt-1 text-red-800/90">{internalListError}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => {
            const active = phaseFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPhaseFilter(key)}
                className={cn(
                  "min-h-[40px] rounded-full px-3 text-sm font-medium transition-colors sm:px-4",
                  active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground ring-1 ring-border",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-[40px] rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm"
          >
            <option value="date">Date (newest first)</option>
            <option value="completeness">Completeness (high first)</option>
            <option value="hours">Hours remaining (urgent first)</option>
          </select>
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-3 font-semibold">Room</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Phase</th>
              <th className="p-3 font-semibold">Completeness</th>
              <th className="p-3 font-semibold">48hr Clock</th>
              <th className="p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No incidents match this filter.
                </td>
              </tr>
            ) : (
              rows.map((inc) => {
                const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
                return (
                  <tr key={inc.id} className="border-b border-border/80 last:border-0">
                    <td className="p-3">
                      <span className="font-semibold text-primary">{inc.residentRoom}</span>
                    </td>
                    <td className="p-3 text-foreground">{displayIncidentType(inc.incidentType)}</td>
                    <td className="p-3">
                      <PhaseBadge phase={inc.phase} />
                    </td>
                    <td className="p-3">
                      <CompletenessRing pct={pct} diameter={40} />
                    </td>
                    <td className="p-3">
                      <ClockDisplay clock={inc.clock} />
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="min-h-[40px] border-primary text-primary" asChild>
                        <Link href={buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)}>
                            View
                          </Link>
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No incidents match this filter.
          </p>
        ) : (
          rows.map((inc) => {
            const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
            return (
              <div key={inc.id} className="mb-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">
                    Room <span className="text-primary">{inc.residentRoom}</span> —{" "}
                    {displayIncidentType(inc.incidentType)}
                  </p>
                  <PhaseBadge phase={inc.phase} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <CompletenessRing pct={pct} diameter={32} />
                  <span className="text-sm font-medium text-foreground">{pct}% complete</span>
                </div>
                <div className="mt-2">
                  <ClockDisplay clock={inc.clock} />
                </div>
                <Button asChild className="mt-4 w-full min-h-[48px] bg-primary font-semibold text-primary-foreground">
                  <Link href={buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)}>
                            View
                          </Link>
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
