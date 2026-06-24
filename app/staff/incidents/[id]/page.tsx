import { StaffIncidentDetailView } from "@/components/staff/staff-incident-detail-view"
import { getCurrentUser } from "@/lib/auth"
import { canAccessPhase2 } from "@/lib/waik-roles"

export default async function StaffIncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const useAdminDetail = Boolean(user?.isAdminTier && !user?.isWaikSuperAdmin)
  const canManageInvestigation = Boolean(
    user && (user.isWaikSuperAdmin || canAccessPhase2(user.roleSlug)),
  )

  if (useAdminDetail) {
    return (
      <StaffIncidentDetailView
        incidentId={id}
        variant="admin"
        backHref="/staff/incidents"
        phase1ReportHref={`/admin/incidents/${id}/phase1-report`}
        closureReportHref={`/admin/incidents/${id}/report`}
        investigationWorkspaceHref={
          canManageInvestigation ? `/admin/incidents/${id}?workspace=phase2` : undefined
        }
        canManageInvestigation={canManageInvestigation}
      />
    )
  }

  return <StaffIncidentDetailView incidentId={id} />
}
