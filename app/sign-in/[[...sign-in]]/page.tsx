import { Suspense } from "react"

import { AuthLoadingFallback } from "@/components/ui/auth-loading-fallback"

import { SignInView } from "./sign-in-view"

/**
 * Clerk sign-in. Suspense avoids Next.js App Router errors when Clerk uses `useSearchParams` internally.
 */
export default function ClerkSignInPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback message="Loading sign-in…" />}>
      <SignInView />
    </Suspense>
  )
}
