"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { AuthPageFrame } from "@/components/ui/auth-background"

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const facility = searchParams.get("facility")?.trim() || "your community"

  return (
    <AuthPageFrame>
      <div className="w-full max-w-lg">
        <div className="space-y-8 rounded-3xl border border-border/20 bg-background/90 p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="flex justify-center">
            <Image src="/waik-logo.png" alt="WAiK" width={200} height={80} className="h-14 w-auto" priority />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Welcome to WAiK</h1>
            <p className="text-lg text-foreground/80">
              You&apos;ve been invited to <span className="font-semibold text-foreground">{facility}</span>.
            </p>
            <p className="text-sm text-muted-foreground sm:text-base">
              Please sign in with the credentials from your welcome email.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            Sign In
          </Link>
          <p className="text-xs text-muted-foreground sm:text-sm">Your password will need to be changed after first sign in.</p>
        </div>
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
