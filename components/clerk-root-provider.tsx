"use client"

import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import type { ClerkAppearance } from "@/lib/clerk-appearance"

export function ClerkRootProvider({
  children,
  appearance,
  signInForceRedirectUrl,
  signUpForceRedirectUrl,
  afterSignOutUrl,
}: {
  children: React.ReactNode
  appearance: ClerkAppearance
  signInForceRedirectUrl: string
  signUpForceRedirectUrl: string
  afterSignOutUrl: string
}) {
  return (
    <ClerkProvider
      appearance={appearance}
      signInForceRedirectUrl={signInForceRedirectUrl}
      signUpForceRedirectUrl={signUpForceRedirectUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {children}
    </ClerkProvider>
  )
}

