"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { AllIncidentsFilterBar } from "@/components/admin/all-incidents-filter-bar"
import { useResidentIncidentFilters, type ResidentIncidentRow } from "@/components/admin/resident-incidents-section"
import type { IncidentPhase, IncidentSummary } from "@/lib/types/incident-summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Loader2 } from "lucide-react"

function RingPct({ pct }: { pct: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold text-primary">
      {pct}
    </div>
  )
}

function phaseLabel(p: IncidentPhase): string {
  switch (p) {
    case "phase_1_in_progress":
      return "Phase 1 in progress"
    case "phase_1_complete":
      return "Phase 1 complete"
    case "phase_2_in_progress":
      return "Phase 2"
    case "closed":
      return "Closed"
    default:
      return p
  }
}

function toResidentRow(inc: IncidentSummary): ResidentIncidentRow {
  const room = inc.residentRoom?.trim()
  const who = [inc.residentName?.trim(), room ? `Room ${room}` : null].filter(Boolean).join(" · ")
  return {
    id: inc.id,
    title: who || "Incident",
    phase: inc.phase,
    completenessScore: inc.completenessScore,
    createdAt: inc.startedAt,
    startedAt: inc.startedAt,
    staffName: inc.reportedByName,
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
    const suffix = getAdminContextQueryString(searchParams)
    try {
      const res = await fetch(`/api/incidents${suffix}`, { credentials: "include" })
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

  const filterRows = useMemo(() => incidents.map(toResidentRow), [incidents])
  const f = useResidentIncidentFilters(filterRows)
  const byId = useMemo(() => new Map(incidents.map((i) => [i.id, i] as const)), [incidents])

  const tableRows = useMemo(() => {
    return f.filtered.map((r) => byId.get(r.id)).filter((x): x is IncidentSummary => x != null)
  }, [byId, f.filtered])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        <PageHeader
          className="mb-2"
          title="All incidents"
          description=""
        />
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.length > 0 ? <AllIncidentsFilterBar incidents={filterRows} f={f} /> : null}
            <p className="text-center text-sm text-muted-foreground">
              {incidents.length === 0
                ? "No incidents for this facility."
                : `${f.filtered.length} of ${incidents.length} incident${incidents.length === 1 ? "" : "s"} in view`}
            </p>
            {incidents.length > 0 && f.filtered.length === 0
              ? (
                  <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                    No incidents match the current filters. Try adjusting type, date, or staff.
                  </p>
                )
              : null}
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
                        const comp = Math.round(inc.completenessScore ?? 0)
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
                              {inc.incidentType || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-primary text-primary-foreground">{phaseLabel(inc.phase)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <RingPct pct={`${comp}%`} />
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
