"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
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
import {
  getEffectiveFacilityIdForApi,
  getEffectiveOrganizationIdForApi,
} from "@/lib/admin-session-scope"
import { userCanReportIncidents } from "@/lib/waik-roles"
import { AllIncidentsFilterBar } from "@/components/admin/all-incidents-filter-bar"
import { useResidentIncidentFilters, type ResidentIncidentRow } from "@/components/admin/resident-incidents-section"
import { StaffIncidentPill } from "@/components/staff/staff-incident-pill"
import { StaffNewReportCard } from "@/components/staff/staff-new-report-card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { displayIncidentPhaseShort } from "@/lib/incidents/presentation"
import { mapIncidentSummaryToStaffPill } from "@/lib/incidents/map-incident-summary-to-pill"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { mapIncidentSummaryToListRow, type IncidentListRow } from "@/lib/types/incident-list-row"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { classifyIncident, computeClock } from "@/lib/utils/incident-classification"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

const QUEUE_CARD =
  "min-h-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background/95 to-accent/[0.07] shadow-md"

const PILL_GRID =
  "m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 min-[1200px]:grid-cols-4"

type PhaseFilter = "all" | IncidentSummary["phase"]

const PHASE_FILTERS: Array<{ value: PhaseFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "phase_1_in_progress", label: displayIncidentPhaseShort("phase_1_in_progress") },
  { value: "phase_1_complete", label: displayIncidentPhaseShort("phase_1_complete") },
  { value: "phase_2_in_progress", label: displayIncidentPhaseShort("phase_2_in_progress") },
  { value: "closed", label: displayIncidentPhaseShort("closed") },
]

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

function matchesPhaseFilter(phase: IncidentSummary["phase"], filter: PhaseFilter): boolean {
  if (filter === "all") return true
  return phase === filter
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className={QUEUE_CARD}>
      <div className="border-b border-border/50 px-4 py-3.5 sm:px-5 sm:py-4">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">{eyebrow}</p>
        ) : null}
        <h2 className={cn("font-semibold text-foreground", eyebrow ? "mt-1" : "")}>{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="px-3 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  )
}

function PillGrid({
  rows,
  loading,
  emptyTitle,
  onSelect,
}: {
  rows: StaffIncidentSummary[]
  loading: boolean
  emptyTitle: string
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1200px]:grid-cols-4">
        <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
        <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
        <Skeleton className="hidden h-36 w-full min-w-0 rounded-2xl sm:block" />
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyTitle}
      </p>
    )
  }
  return (
    <ul className={PILL_GRID}>
      {rows.map((inc) => (
        <li key={inc.id} className="min-w-0">
          <StaffIncidentPill incident={inc} mode="all" onSelect={() => onSelect(inc.id)} />
        </li>
      ))}
    </ul>
  )
}

export function AdminIncidentsListClient({
  isWaikSuperAdmin = false,
  roleSlug = "",
  userFacilityId = "",
}: {
  isWaikSuperAdmin?: boolean
  roleSlug?: string
  userFacilityId?: string
}) {
  const router = useRouter()
  const searchParams = useAdminUrlSearchParams()
  const effectiveFacilityId = getEffectiveFacilityIdForApi(searchParams)
  const effectiveOrganizationId = getEffectiveOrganizationIdForApi(searchParams)
  const showNewReport = userCanReportIncidents(
    { roleSlug, isWaikSuperAdmin, facilityId: userFacilityId },
    effectiveFacilityId,
  )
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all")

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
    setPhaseFilter: setFilterBarPhase,
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
      setFilterBarPhase("all")
    } else {
      setPhaseInFilter([])
    }
  }, [urlSyncKey, setDateFrom, setDateTo, setTypeFilter, setTrendTypeBucket, setPhaseInFilter, setFilterBarPhase])

  const filteredRows = useMemo(() => {
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

  const pillRows = useMemo(() => {
    const ids = new Set(filteredRows.map((r) => r.id))
    return incidents
      .filter((inc) => ids.has(inc.id) && matchesPhaseFilter(inc.phase, phaseFilter))
      .map(mapIncidentSummaryToStaffPill)
  }, [filteredRows, incidents, phaseFilter])

  const phaseCounts = useMemo(() => {
    const ids = new Set(filteredRows.map((r) => r.id))
    const scoped = incidents.filter((inc) => ids.has(inc.id))
    const counts: Record<PhaseFilter, number> = {
      all: scoped.length,
      phase_1_in_progress: 0,
      phase_1_complete: 0,
      phase_2_in_progress: 0,
      closed: 0,
    }
    for (const inc of scoped) {
      counts[inc.phase] += 1
    }
    return counts
  }, [filteredRows, incidents])

  const goDetail = (id: string) => {
    router.push(buildAdminPathWithContext(`/admin/incidents/${id}`, searchParams))
  }

  const hasLinkFilters = Boolean(
    parsedUrl.severity || parsedUrl.repeatOnly || parsedUrl.unit || parsedUrl.role || parsedUrl.bottleneck,
  )

  return (
    <div className="relative flex w-full min-h-0 flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 md:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Facility pipeline</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">All incidents</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Every report in this community — filter by phase, type, and date, then open an incident to investigate.
            </p>
          </div>
          {showNewReport ? (
            <div className="flex h-full w-full min-h-0 min-w-0 shrink-0 lg:max-w-[230px] xl:max-w-[253px]">
              <StaffNewReportCard
                facilityId={effectiveFacilityId}
                organizationId={effectiveOrganizationId}
              />
            </div>
          ) : null}
        </div>

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
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No incidents for this facility"
            description="Incident reports will appear here as they move through the facility pipeline."
          />
        ) : (
          <div className="space-y-4">
            <AllIncidentsFilterBar incidents={filterRows} f={f} />

            <p className="text-center text-sm text-muted-foreground">
              {pillRows.length} of {incidents.length} incident{incidents.length === 1 ? "" : "s"} in view
              {hasLinkFilters ? (
                <span className="mt-1 block text-xs">
                  Includes link-applied filters (severity, repeat, unit, role, or bottleneck) where present.
                </span>
              ) : null}
            </p>

            {f.filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                No incidents match the current filters. Try adjusting type, date, or staff.
              </p>
            ) : null}
            {f.filtered.length > 0 && filteredRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                No incidents match link filters (severity, repeat, unit, role, or bottleneck). Try clearing filters or
                widening the date range.
              </p>
            ) : null}

            {filteredRows.length > 0 ? (
              <SectionCard
                title="Incident reports"
                description="Browse the full facility list — tap a card to open the investigation workspace."
              >
                <Tabs
                  value={phaseFilter}
                  onValueChange={(v) => setPhaseFilter(v as PhaseFilter)}
                  className="flex min-h-0 w-full flex-col gap-3"
                >
                  <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
                    {PHASE_FILTERS.map(({ value, label }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="shrink-0 grow rounded-xl border border-transparent px-2 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md sm:px-3 sm:text-sm"
                      >
                        <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                          {label}
                          <Badge variant="secondary" className="rounded-full px-1.5 text-[0.65rem] tabular-nums">
                            {loading ? "…" : phaseCounts[value]}
                          </Badge>
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {PHASE_FILTERS.map(({ value }) => (
                    <TabsContent
                      key={value}
                      value={value}
                      className="mt-0 min-h-0 outline-none data-[state=inactive]:hidden"
                    >
                      <PillGrid
                        rows={pillRows}
                        loading={loading}
                        emptyTitle="No incidents in this phase"
                        onSelect={goDetail}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </SectionCard>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
