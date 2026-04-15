"use client"

import { useEffect } from "react"
import { useClerk } from "@clerk/nextjs"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"

/**
 * Target for “Sign out” links. Completes Clerk sign-out and returns to sign-in.
 */
export default function SignOutPage() {
  const { signOut } = useClerk()

  useEffect(() => {
    void signOut({ redirectUrl: getClerkAfterSignOutUrl() })
  }, [signOut])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Signing out…</p>
    </div>
  )
}
