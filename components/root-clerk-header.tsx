"use client"

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { ConditionalRootHeader } from "@/components/conditional-root-header"
import { SignedOutHeaderSignIn } from "@/components/signed-out-header-sign-in"
import type { ClerkAppearance } from "@/lib/clerk-appearance"

/**
 * Keeps Clerk client components and `usePathname` in one client boundary
 * (avoids RSC/child-boundary issues with Next 15 + Clerk in the root layout).
 */
export function RootClerkHeader({
  appearance,
  afterSignOutUrl,
}: {
  appearance: ClerkAppearance
  afterSignOutUrl: string
}) {
  return (
    <ConditionalRootHeader>
      <SignedOut>
        <SignedOutHeaderSignIn />
      </SignedOut>
      <SignedIn>
        <UserButton appearance={appearance} afterSignOutUrl={afterSignOutUrl} />
      </SignedIn>
    </ConditionalRootHeader>
  )
}
