import { redirect } from "next/navigation"

/**
 * Legacy Clerk “after sign-in” path. Prefer `/auth/redirect` in Clerk Dashboard + env.
 */
export default function AfterSignInPage() {
  redirect("/auth/redirect")
}
