import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

/**
 * Post–sign-in role routing: super admin → /waik-admin, admin tier → /admin/dashboard,
 * staff → /staff/dashboard. `mustChangePassword` sends users to /change-password first.
 * Clerk after-sign-in URL should be `/auth/redirect` (see `.env.example`).
 */
export default async function AuthRedirectPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/sign-in")
  }
  if (currentUser.mustChangePassword) {
    redirect("/change-password")
  }
  if (currentUser.isWaikSuperAdmin) {
    redirect("/waik-admin")
  }
  if (currentUser.isAdminTier) {
    redirect("/admin/dashboard")
  }
  redirect("/staff/dashboard")
}
