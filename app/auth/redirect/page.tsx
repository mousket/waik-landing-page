import { auth } from "@clerk/nextjs/server"
import { getCurrentUser } from "@/lib/auth"
import { redirectPathFromResolution, resolveWaikApplicationEntry } from "@/lib/post-auth-destination"
import { PostAuthRedirectClient } from "./post-auth-redirect-client"

/**
 * Post–sign-in role routing: super admin → /waik-admin, admin tier → /admin/dashboard,
 * staff → /staff/dashboard. `mustChangePassword` sends users to /change-password first.
 * Clerk after-sign-in URL should be `/auth/redirect` (see `.env.example`).
 *
 * If Clerk has a session but there is no Mongo `UserModel` (getCurrentUser null), send to
 * `/auth/account-pending` — **not** `/sign-in`, or Clerk+forceRedirectUrl causes an infinite loop.
 *
 * The destination is resolved on the server, but navigation uses the client router (see
 * `PostAuthRedirectClient`) instead of `redirect()`. A server `redirect()` throw during
 * this route’s RSC pass can break React hook order in the same transition as Clerk
 * finishing sign-in (Next 15 + App Router).
 */
export default async function AuthRedirectPage() {
  const { userId } = await auth()
  const currentUser = await getCurrentUser()
  const to = redirectPathFromResolution(resolveWaikApplicationEntry(userId ?? null, currentUser))

  return <PostAuthRedirectClient to={to} />
}
