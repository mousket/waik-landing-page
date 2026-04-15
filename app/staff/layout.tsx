import type React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { StaffAppShell } from "@/components/staff/staff-app-shell"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  if (user.isWaikSuperAdmin) {
    redirect("/waik-admin")
  }
  if (user.isAdminTier) {
    redirect("/admin/dashboard")
  }

  return (
    <StaffAppShell firstName={user.firstName} lastName={user.lastName}>
      {children}
    </StaffAppShell>
  )
}
