"use client"

import { SignUp } from "@clerk/nextjs"

import { AuthPageFrame } from "@/components/ui/auth-background"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkPostAuthUrl } from "@/lib/clerk-routes"

export function SignUpView() {
  return (
    <AuthPageFrame>
      <SignUp
        routing="path"
        path="/sign-up"
        appearance={clerkAppearance}
        forceRedirectUrl={getClerkPostAuthUrl()}
        signInForceRedirectUrl={getClerkPostAuthUrl()}
      />
    </AuthPageFrame>
  )
}
