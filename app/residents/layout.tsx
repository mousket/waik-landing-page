import type React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AdminAppShell } from "@/components/admin/admin-app-shell"
import { StaffAppShell } from "@/components/staff/staff-app-shell"

/**
 * Shared /residents/* segment: same URL for staff and admin; shell matches role.
 */
export default async function ResidentsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  if (user.mustChangePassword) {
    redirect("/change-password")
  }

  if (user.isWaikSuperAdmin) {
    return (
      <AdminAppShell
        firstName={user.firstName}
        lastName={user.lastName}
        defaultFacilityId={user.facilityId?.trim() || undefined}
        showFacilitySwitcher
        isWaikSuperAdmin
      >
        {children}
      </AdminAppShell>
    )
  }

  if (user.isAdminTier) {
    return (
      <AdminAppShell
        firstName={user.firstName}
        lastName={user.lastName}
        defaultFacilityId={user.facilityId?.trim() || undefined}
        showFacilitySwitcher
        isWaikSuperAdmin={false}
      >
        {children}
      </AdminAppShell>
    )
  }

  const todayYmd = new Date().toISOString().slice(0, 10)
  const unitLabel =
    user.selectedUnit && user.selectedUnitDate && user.selectedUnitDate === todayYmd
      ? user.selectedUnit
      : null

  return (
    <StaffAppShell firstName={user.firstName} lastName={user.lastName} unitLabel={unitLabel}>
      {children}
    </StaffAppShell>
  )
}
