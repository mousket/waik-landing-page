"use client"

import type React from "react"
import Link from "next/link"
import { WaikLogo } from "@/components/waik-logo"

export function WaikAdminShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] bg-brand-shell-bg text-brand-body">
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-border/20 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:h-16"
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="md:hidden">
              <WaikLogo href="/waik-admin" size="md" />
            </span>
            <span className="hidden md:inline">
              <WaikLogo href="/waik-admin" size="lg" />
            </span>
            <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
              Super Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span
              className="max-w-[140px] truncate text-sm text-muted-foreground sm:max-w-xs"
              title={userEmail}
            >
              {userEmail}
            </span>
            <Link href="/sign-out" className="shrink-0 text-sm font-medium text-primary hover:underline">
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-14 md:px-6 md:pt-16">{children}</main>
    </div>
  )
}
