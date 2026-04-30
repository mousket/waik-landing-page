"use client"

import { UserButton } from "@clerk/nextjs"
import { LayoutDashboard } from "lucide-react"

import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl, getClerkPostAuthUrl } from "@/lib/clerk-routes"

/**
 * Landing header: Clerk menu plus a clear path into the product for signed-in users.
 */
export function LandingUserButton() {
  const appHref = getClerkPostAuthUrl()

  return (
    <UserButton appearance={clerkAppearance} afterSignOutUrl={getClerkAfterSignOutUrl()}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Open WAiK"
          href={appHref}
          labelIcon={<LayoutDashboard className="h-4 w-4" aria-hidden />}
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
