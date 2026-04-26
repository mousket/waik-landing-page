"use client"

import { useClerk } from "@clerk/nextjs"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"
import { Button } from "@/components/ui/button"

export function SignOutAndRetry() {
  const { signOut } = useClerk()
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void signOut({ redirectUrl: getClerkAfterSignOutUrl() })}
    >
      Sign out and try another account
    </Button>
  )
}
