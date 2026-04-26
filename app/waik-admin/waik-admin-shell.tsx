"use client"

import type React from "react"
import Link from "next/link"
import { brand } from "@/lib/design-tokens"
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
        className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b bg-white px-4"
        style={{ borderColor: brand.midGray }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <WaikLogo href="/waik-admin" size="lg" />
            <span
              className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs"
              style={{ borderColor: brand.midGray, color: brand.darkTeal, backgroundColor: brand.lightBg }}
            >
              Super Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span
              className="max-w-[140px] truncate text-sm text-brand-muted sm:max-w-xs"
              title={userEmail}
            >
              {userEmail}
            </span>
            <Link
              href="/sign-out"
              className="shrink-0 text-sm font-medium"
              style={{ color: brand.teal }}
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-16 md:px-6">{children}</main>
    </div>
  )
}
