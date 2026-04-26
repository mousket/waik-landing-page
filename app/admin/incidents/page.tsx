"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
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

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        <PageHeader
          className="mb-6"
          title="All incidents"
          description="The complete incident pipeline for your community."
        />
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-background shadow-xl">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-sm font-semibold">
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Completeness</th>
                  <th className="px-4 py-3">48hr clock</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No incidents for this facility.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => {
                    const detailPath = buildAdminPathWithContext(`/admin/incidents/${inc.id}`, searchParams)
                    const comp = Math.round(inc.completenessScore ?? 0)
                    return (
                      <tr
                        key={inc.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">{inc.residentRoom || "—"}</td>
                        <td className="px-4 py-3">{inc.incidentType || "—"}</td>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
