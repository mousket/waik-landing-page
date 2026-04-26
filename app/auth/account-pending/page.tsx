import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { SignOutAndRetry } from "@/components/auth/sign-out-and-retry"
import { AuthPageFrame } from "@/components/ui/auth-background"
import { getCurrentUser } from "@/lib/auth"

/**
 * Clerk session exists but no WAiK Mongo user — avoids /auth/redirect → /sign-in → /auth/redirect loop.
 */
export default async function AccountPendingPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }
  const user = await getCurrentUser()
  if (user) {
    redirect("/auth/redirect")
  }

  return (
    <AuthPageFrame>
      <div className="w-full max-w-md">
        <div className="space-y-6 rounded-3xl border border-border/20 bg-background/90 p-8 shadow-xl backdrop-blur-sm">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Account not linked yet</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in, but this email is not linked to a WAiK facility account. Ask an administrator to invite
              you, or use the account that was given access.
            </p>
          </div>
          <SignOutAndRetry />
          <p className="text-xs text-muted-foreground">
            If you just signed up: your Clerk user may need a matching user in the database (see seed scripts or admin
            invite).
          </p>
        </div>
      </div>
    </AuthPageFrame>
  )
}
