import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StaffDashboardClient } from "./staff-dashboard-client"

export default async function StaffDashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  if (user.isAdminTier) {
    redirect("/admin/dashboard")
  }

  const todayYmd = new Date().toISOString().slice(0, 10)
  const selectedUnit =
    user.selectedUnit && user.selectedUnitDate && user.selectedUnitDate === todayYmd
      ? user.selectedUnit
      : null

  return <StaffDashboardClient firstName={user.firstName || "there"} selectedUnit={selectedUnit} />
}
