"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { buildAdminIncidentsApiPath, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import {
  adminIncidentsFetchDaysHint,
  adminIncidentsUrlHasDrilldownParams,
  parseAdminIncidentsUrl,
} from "@/lib/admin/parse-admin-incidents-url"
import { incidentMatchesBottleneck } from "@/lib/admin/trends-staffing-throughput-metrics"
import { isRepeatWithin7Days } from "@/lib/admin/trends-facility-health-metrics"
import { incidentHasOverdueIdt } from "@/lib/admin/incident-attention-helpers"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { AllIncidentsFilterBar } from "@/components/admin/all-incidents-filter-bar"
import { useResidentIncidentFilters, type ResidentIncidentRow } from "@/components/admin/resident-incidents-section"
import { IncidentCompletionIndicator } from "@/components/incidents/incident-completion-indicator"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { PhaseBadge } from "@/components/shared/phase-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { displayIncidentType } from "@/lib/incidents/presentation"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { mapIncidentSummaryToListRow, type IncidentListRow } from "@/lib/types/incident-list-row"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import { FileText } from "lucide-react"

function unitKeyFromRoom(room: string): string {
  const r = room.trim()
  if (!r) return "Unknown"
  const wing = r.split(/[-/]/)[0]?.trim()
  if (wing && wing.length <= 8) return wing
  const first = r.split(/\s+/)[0]?.trim()
  return first || r.slice(0, 6)
}

function toResidentRow(inc: IncidentListRow): ResidentIncidentRow {
  const room = inc.residentRoom?.trim()
  const who = [inc.residentName?.trim(), room ? `Room ${room}` : null].filter(Boolean).join(" · ")
  return {
    id: inc.id,
    title: who || "Incident",
    phase: inc.phase,
    completenessScore: inc.completenessPercent,
    createdAt: inc.startedAt,
    startedAt: inc.startedAt,
    staffName: inc.reporterName,
    incidentType: inc.incidentType,
  }
}

export default function AdminIncidentsListPage() {
  const searchParams = useAdminUrlSearchParams()
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const daysHint = adminIncidentsFetchDaysHint(searchParams)
    const path = buildAdminIncidentsApiPath(searchParams, daysHint ? { days: String(daysHint) } : {})
    try {
      const res = await fetch(path, { credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Could not load incidents")
        setIncidents([])
        return
      }
      const j = (await res.json()) as { incidents?: IncidentSummary[] }
      setIncidents(j.incidents ?? [])
    } catch {
      setError("Could not load incidents")
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    void load()
  }, [load])

  const listRows = useMemo(() => incidents.map(mapIncidentSummaryToListRow), [incidents])
  const filterRows = useMemo(() => listRows.map(toResidentRow), [listRows])
  const f = useResidentIncidentFilters(filterRows)
  const {
    setDateFrom,
    setDateTo,
    setTypeFilter,
    setTrendTypeBucket,
    setPhaseInFilter,
    setPhaseFilter,
  } = f
  const byId = useMemo(() => new Map(listRows.map((i) => [i.id, i] as const)), [listRows])

  const parsedUrl = useMemo(() => parseAdminIncidentsUrl(searchParams), [searchParams.toString()])

  const urlSyncKey = searchParams.toString()

  useEffect(() => {
    const sp = new URLSearchParams(urlSyncKey)
    if (!adminIncidentsUrlHasDrilldownParams(sp)) return
    const p = parseAdminIncidentsUrl(sp)
    if (p.dateFrom) setDateFrom(p.dateFrom)
    if (p.dateTo) setDateTo(p.dateTo)
    if (p.trendTypeBucket) {
      setTrendTypeBucket(p.trendTypeBucket)
      setTypeFilter("all")
    } else if (p.typeExact) {
      setTrendTypeBucket(null)
      setTypeFilter(p.typeExact)
    } else {
      setTrendTypeBucket(null)
    }
    if (p.phaseIn.length) {
      setPhaseInFilter(p.phaseIn)
      setPhaseFilter("all")
    } else {
      setPhaseInFilter([])
    }
  }, [urlSyncKey, setDateFrom, setDateTo, setTypeFilter, setTrendTypeBucket, setPhaseInFilter, setPhaseFilter])

  const tableRows = useMemo(() => {
    const base = f.filtered.map((r) => byId.get(r.id)).filter((x): x is IncidentListRow => x != null)
    const nowMs = Date.now()
    let rows = base
    if (parsedUrl.severity) {
      rows = rows.filter((row) => {
        const inc = incidents.find((i) => i.id === row.id)
        if (!inc) return false
        const u = classifyIncident(inc, nowMs)
        const sev = u === "red_alert" ? "critical" : u === "yellow_awaiting" ? "warning" : "normal"
        return sev === parsedUrl.severity
      })
    }
    if (parsedUrl.repeatOnly) {
      rows = rows.filter((row) => {
        const inc = incidents.find((i) => i.id === row.id)
        return Boolean(inc && isRepeatWithin7Days(inc, incidents))
      })
    }
    if (parsedUrl.unit) {
      rows = rows.filter((row) => unitKeyFromRoom(row.residentRoom || "") === parsedUrl.unit)
    }
    if (parsedUrl.role) {
      rows = rows.filter((row) => {
        const inc = incidents.find((i) => i.id === row.id)
        return Boolean(inc && (inc.reportedByRole || "").trim().toLowerCase() === parsedUrl.role)
      })
    }
    if (parsedUrl.bottleneck) {
      const bottleneck = parsedUrl.bottleneck
      rows = rows.filter((row) => {
        const inc = incidents.find((i) => i.id === row.id)
        if (!inc) return false
        if (bottleneck === "overdue_docs") {
          const clock = computeClock(inc.phase1SignedAt, 48, nowMs)
          if (inc.phase === "phase_2_in_progress" && clock?.status === "overdue") return true
          return incidentHasOverdueIdt(inc, nowMs)
        }
        return incidentMatchesBottleneck(inc, bottleneck, nowMs)
      })
    }
    return rows
  }, [
    byId,
    f.filtered,
    incidents,
    parsedUrl.bottleneck,
    parsedUrl.repeatOnly,
    parsedUrl.role,
    parsedUrl.severity,
    parsedUrl.unit,
  ])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        <PageHeader
          className="mb-2"
          title="All incidents"
          description=""
        />
        {adminIncidentsUrlHasDrilldownParams(searchParams) ? (
          <div
            className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/90"
            role="status"
          >
            Filters were applied from the address bar (Trends drilldown). Use{" "}
            <span className="font-semibold">Clear</span> in the filter card to widen the list.
          </div>
        ) : null}
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.length > 0 ? <AllIncidentsFilterBar incidents={filterRows} f={f} /> : null}
            {incidents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No incidents for this facility"
                description="Incident reports will appear here as they move through the facility pipeline."
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {tableRows.length} of {incidents.length} incident{incidents.length === 1 ? "" : "s"} in view
                {parsedUrl.severity ||
                parsedUrl.repeatOnly ||
                parsedUrl.unit ||
                parsedUrl.role ||
                parsedUrl.bottleneck ? (
                  <span className="mt-1 block text-xs">
                    Includes link-applied filters (severity, repeat, unit, role, or bottleneck) where present.
                  </span>
                ) : null}
              </p>
            )}
            {incidents.length > 0 && f.filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                No incidents match the current filters. Try adjusting type, date, or staff.
              </p>
            ) : null}
            {incidents.length > 0 && f.filtered.length > 0 && tableRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                No incidents match link filters (severity, repeat, unit, role, or bottleneck). Try clearing filters or
                widening the date range.
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/95 shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-sm font-semibold">
                    <th className="px-4 py-3">Resident / room</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Completeness</th>
                    <th className="px-4 py-3">48hr clock</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                            No incidents for this facility.
                          </td>
                        </tr>
                      )
                    : tableRows.length === 0
                      ? null
                    : tableRows.map((inc) => {
                        const detailPath = buildAdminPathWithContext(`/admin/incidents/${inc.id}`, searchParams)
                        return (
                          <tr
                            key={inc.id}
                            className="border-b border-border/80 transition-colors last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3">
                              <span className="line-clamp-1 font-medium">
                                {inc.residentName || "Resident"}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {inc.residentRoom ? `Room ${inc.residentRoom}` : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {displayIncidentType(inc.incidentType)}
                            </td>
                            <td className="px-4 py-3">
                              <PhaseBadge phase={inc.phase} size="sm" />
                            </td>
                            <td className="px-4 py-3">
                              <IncidentCompletionIndicator percent={inc.completenessPercent} ringSize={40} strokeWidth={3} />
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant="outline" asChild className="min-h-12 border-primary/30 sm:min-h-10">
                                <Link href={detailPath}>View</Link>
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
