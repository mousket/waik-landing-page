"use client"

import { SignIn } from "@clerk/nextjs"

import { AuthPageFrame } from "@/components/ui/auth-background"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkPostAuthUrl } from "@/lib/clerk-routes"

/**
 * Client-only: Clerk's SignIn uses hooks / search params and must not run as a Server Component.
 */
export function SignInView() {
  return (
    <AuthPageFrame>
      <SignIn
        routing="path"
        path="/sign-in"
        appearance={clerkAppearance}
        withSignUp={false}
        forceRedirectUrl={getClerkPostAuthUrl()}
        signUpForceRedirectUrl={getClerkPostAuthUrl()}
      />
    </AuthPageFrame>
  )
}
