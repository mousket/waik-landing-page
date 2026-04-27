"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { SignUp } from "@clerk/nextjs"

import { AuthPageFrame } from "@/components/ui/auth-background"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkPostAuthUrl } from "@/lib/clerk-routes"

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const facility = searchParams.get("facility")?.trim() || "your community"

  return (
    <AuthPageFrame>
      <div className="w-full max-w-md">
        <div className="mb-6 space-y-4 rounded-3xl border border-border/20 bg-background/90 p-6 text-center shadow-xl backdrop-blur-sm sm:p-8">
          <div className="flex justify-center">
            <Image src="/waik-logo.png" alt="WAiK" width={200} height={80} className="h-14 w-auto" priority />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Welcome to WAiK</h1>
          <p className="text-base text-foreground/80">
            You&apos;ve been invited to <span className="font-semibold text-foreground">{facility}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Create your account below. You&apos;ll be redirected to the right home screen, with a short tour the first
            time. If you were told to use an email link only, you can also{" "}
            <Link className="font-medium text-primary underline" href="/sign-in">
              sign in
            </Link>
            .
          </p>
        </div>
        <div className="mx-auto w-full min-w-0 max-w-sm rounded-2xl border border-border/20 bg-card/50 p-4 shadow-lg">
          <SignUp
            routing="virtual"
            appearance={clerkAppearance}
            signInUrl="/sign-in"
            signInForceRedirectUrl={getClerkPostAuthUrl()}
            forceRedirectUrl={getClerkPostAuthUrl()}
          />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your team may require a password change after first sign-in.
        </p>
      </div>
    </AuthPageFrame>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthPageFrame>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AuthPageFrame>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
