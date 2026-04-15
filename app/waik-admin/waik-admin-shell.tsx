"use client"

import type React from "react"
import Link from "next/link"
import { brand } from "@/lib/design-tokens"

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
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center px-6"
        style={{ backgroundColor: brand.darkTeal }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <Link href="/waik-admin" className="text-xl font-bold text-white">
              WAiK
            </Link>
            <span className="text-sm" style={{ color: brand.superAdminLabel }}>
              Super Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="max-w-[200px] truncate text-sm text-white/75 sm:max-w-xs">{userEmail}</span>
            <Link href="/sign-out" className="text-sm text-white underline underline-offset-2">
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-14 md:px-6">{children}</main>
    </div>
  )
}
