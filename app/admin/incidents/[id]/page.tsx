"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { canAccessPhase2 } from "@/lib/waik-roles"
import { useWaikUser } from "@/hooks/use-waik-user"
import type { Incident } from "@/lib/types"
import { Phase2InvestigationShell } from "@/components/admin/phase2-investigation-shell"
import { StaffIncidentDetailView } from "@/components/staff/staff-incident-detail-view"

/**
 * Admin incident detail — same overview UX as staff (`StaffIncidentDetailView`),
 * with `?workspace=phase2` for the full Phase 2 investigation shell.
 */
export default function AdminIncidentDetailPage() {
  const routeParams = useParams<{ id: string }>()
  const incidentId = String(routeParams?.id ?? "")
  const searchParams = useAdminUrlSearchParams()
  const adminApiQ = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const { waikRole, isWaikSuperAdmin } = useWaikUser()

  const workspace = (searchParams.get("workspace") ?? "").trim()
  const isPhase2Workspace = workspace === "phase2"
  const canManageInvestigation = isWaikSuperAdmin || canAccessPhase2(waikRole ?? "")

  const overviewHref = useMemo(
    () => buildAdminPathWithContext(`/admin/incidents/${incidentId}`, searchParams),
    [incidentId, searchParams],
  )
  const investigationWorkspaceHref = useMemo(
    () => buildAdminPathWithContext(`/admin/incidents/${incidentId}?workspace=phase2`, searchParams),
    [incidentId, searchParams],
  )
  const incidentsListHref = useMemo(
    () => buildAdminPathWithContext("/admin/incidents", searchParams),
    [searchParams],
  )

  const [incident, setIncident] = useState<Incident | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(isPhase2Workspace)

  const fetchIncident = useCallback(async () => {
    const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}${adminApiQ}`, {
      credentials: "include",
    })
    if (!res.ok) {
      setIncident(null)
      return
    }
    setIncident((await res.json()) as Incident)
  }, [adminApiQ, incidentId])

  useEffect(() => {
    if (!isPhase2Workspace) {
      setWorkspaceLoading(false)
      return
    }
    setWorkspaceLoading(true)
    void fetchIncident().finally(() => setWorkspaceLoading(false))
  }, [fetchIncident, isPhase2Workspace])

  if (isPhase2Workspace) {
    if (workspaceLoading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }
    if (!incident) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-medium">Incident not found</p>
          <a href={incidentsListHref} className="text-sm text-primary underline-offset-2 hover:underline">
            Back to incidents
          </a>
        </div>
      )
    }
    return (
      <Phase2InvestigationShell
        incident={incident}
        incidentId={incidentId}
        searchParams={searchParams}
        onRefresh={fetchIncident}
        waikRole={waikRole}
        isWaikSuperAdmin={isWaikSuperAdmin}
        backHref={overviewHref}
        backLabel="Incident overview"
      />
    )
  }

  return (
    <StaffIncidentDetailView
      incidentId={incidentId}
      variant="admin"
      apiQueryString={adminApiQ}
      backHref={incidentsListHref}
      phase1ReportHref={buildAdminPathWithContext(
        `/admin/incidents/${incidentId}/phase1-report`,
        searchParams,
      )}
      closureReportHref={buildAdminPathWithContext(`/admin/incidents/${incidentId}/report`, searchParams)}
      investigationWorkspaceHref={canManageInvestigation ? investigationWorkspaceHref : undefined}
      canManageInvestigation={canManageInvestigation}
    />
  )
}
