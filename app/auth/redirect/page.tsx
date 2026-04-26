import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

/**
 * Post–sign-in role routing: super admin → /waik-admin, admin tier → /admin/dashboard,
 * staff → /staff/dashboard. `mustChangePassword` sends users to /change-password first.
 * Clerk after-sign-in URL should be `/auth/redirect` (see `.env.example`).
 *
 * If Clerk has a session but there is no Mongo `UserModel` (getCurrentUser null), send to
 * `/auth/account-pending` — **not** `/sign-in`, or Clerk+forceRedirectUrl causes an infinite loop.
 */
export default async function AuthRedirectPage() {
  const { userId } = await auth()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    if (userId) {
      redirect("/auth/account-pending")
    }
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
