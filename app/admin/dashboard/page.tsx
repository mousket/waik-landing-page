import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell"
import { getCurrentUser } from "@/lib/auth"

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  const canAccessPhase2 = Boolean(user?.canAccessPhase2 || user?.isWaikSuperAdmin)
  const userDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "there"
  const defaultFacilityId = user?.facilityId?.trim() || undefined
  const showFacilityPicker = Boolean(user?.isWaikSuperAdmin || user?.isAdminTier)

  return (
    <AdminDashboardShell
      canAccessPhase2={canAccessPhase2}
      userDisplayName={userDisplayName}
      defaultFacilityId={defaultFacilityId}
      showFacilityPicker={showFacilityPicker}
    />
  )
}
