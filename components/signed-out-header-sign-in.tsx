"use client"

import { SignInButton } from "@clerk/nextjs"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

/** Same CTA styling as landing header “Request a Demo” (`components/header.tsx`). */
const signInButtonClassName =
  "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20"

/**
 * Signed-out header control: CTA matching landing “Request a Demo”. Hidden on auth routes (redundant).
 */
export function SignedOutHeaderSignIn() {
  const pathname = usePathname() ?? ""

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null
  }

  return (
    <SignInButton>
      <Button size="lg" className={signInButtonClassName}>
        Sign in
      </Button>
    </SignInButton>
  )
}
