import type React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AdminAppShell } from "@/components/admin/admin-app-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  if (!user.isAdminTier && !user.isWaikSuperAdmin) {
    redirect("/staff/dashboard")
  }

  return (
    <AdminAppShell
      firstName={user.firstName}
      lastName={user.lastName}
      defaultFacilityId={user.facilityId?.trim() || undefined}
      showFacilitySwitcher={Boolean(user.isAdminTier || user.isWaikSuperAdmin)}
      isWaikSuperAdmin={Boolean(user.isWaikSuperAdmin)}
    >
      {children}
    </AdminAppShell>
  )
}
