"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { Bell } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"
import { cn } from "@/lib/utils"
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav"
import { WaikLogo } from "@/components/waik-logo"

const NAV_LINKS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Incidents", href: "/admin/incidents" },
  { label: "Assessments", href: "/admin/assessments" },
  { label: "Residents", href: "/admin/residents" },
  { label: "Intelligence", href: "/admin/intelligence" },
  { label: "Settings", href: "/admin/settings" },
] as const

function navActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard"
  }
  if (href === "/admin/settings") {
    return pathname.startsWith("/admin/settings")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminAppShell({
  firstName,
  lastName,
  children,
}: {
  firstName: string
  lastName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-shell-bg text-brand-body">
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-border/20 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:h-16"
      >
        <div className="relative mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 md:gap-4">
          <div className="flex min-w-0 shrink-0 items-center">
            <span className="md:hidden">
              <WaikLogo href="/admin/dashboard" size="md" />
            </span>
            <span className="hidden md:inline">
              <WaikLogo href="/admin/dashboard" size="lg" />
            </span>
          </div>

          <nav className="absolute left-1/2 top-1/2 hidden w-auto max-w-[min(100%,52rem)] -translate-x-1/2 -translate-y-1/2 md:block">
            <ul className="flex flex-wrap items-center justify-center gap-6 lg:gap-8">
              {NAV_LINKS.map(({ label, href }) => {
                const active = navActive(pathname, href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "inline-block border-b-2 pb-0.5 text-sm font-medium transition-colors",
                        active
                          ? "border-brand-teal text-brand-teal"
                          : "border-transparent text-brand-muted hover:text-brand-dark-teal",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center md:h-12 md:w-12"
              style={{ color: brand.muted }}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={1.75} />
            </button>
            <div className="flex shrink-0 items-center [&_.cl-userButtonTrigger]:h-9 [&_.cl-userButtonTrigger]:w-9 md:[&_.cl-userButtonTrigger]:h-10 md:[&_.cl-userButtonTrigger]:w-10">
              <span className="sr-only">{`Signed in as ${[firstName, lastName].filter(Boolean).join(" ")}`}</span>
              <UserButton appearance={clerkAppearance} afterSignOutUrl={getClerkAfterSignOutUrl()} />
            </div>
          </div>
        </div>
      </header>

      <div
        className="flex flex-1 flex-col overflow-y-auto overscroll-contain pt-14 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6 md:pt-16"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>

      <AdminBottomNav />
    </div>
  )
}
