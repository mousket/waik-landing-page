"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const teal = "#0D7377"

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const facility = searchParams.get("facility")?.trim() || "your community"

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: teal }}
    >
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <Image src="/waik-logo.png" alt="WAiK" width={200} height={80} className="h-20 w-auto brightness-0 invert" priority />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Welcome to WAiK</h1>
          <p className="text-lg text-white/90">
            You&apos;ve been invited to <span className="font-semibold">{facility}</span>.
          </p>
          <p className="text-white/80 text-sm sm:text-base">
            Please sign in with the credentials from your welcome email.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold shadow-lg transition hover:bg-white/95"
          style={{ color: teal }}
        >
          Sign In
        </Link>
        <p className="text-white/70 text-xs sm:text-sm">Your password will need to be changed after first sign in.</p>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: teal }}>
          <p className="text-white">Loading…</p>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
