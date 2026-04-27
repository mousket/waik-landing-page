"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminScopeUrlSync, useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { UserButton } from "@clerk/nextjs"
import { Bell, Shield } from "lucide-react"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"
import { cn } from "@/lib/utils"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav"
import { AdminFacilitySwitcher } from "@/components/admin/admin-facility-switcher"
import { SuperAdminAdminEntryTelemetry } from "@/components/admin/super-admin-admin-entry-telemetry"
import { ActivitySessionLogger } from "@/components/activity-session-logger"
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
  if (href === "/admin/residents") {
    return (
      pathname === "/admin/residents" ||
      pathname.startsWith("/admin/residents/") ||
      pathname.startsWith("/residents/")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminAppShell({
  firstName,
  lastName,
  defaultFacilityId,
  showFacilitySwitcher,
  isWaikSuperAdmin = false,
  children,
}: {
  firstName: string
  lastName: string
  defaultFacilityId?: string
  showFacilitySwitcher: boolean
  isWaikSuperAdmin?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useAdminUrlSearchParams()
  useAdminScopeUrlSync()

  const hideFacilitySwitcher =
    pathname.startsWith("/admin/incidents/") ||
    pathname.startsWith("/admin/residents/") ||
    pathname.startsWith("/residents/") ||
    pathname.startsWith("/admin/assessments/")

  /** Dashboard inlines the facility picker beside the Command center greeting. */
  const facilitySwitcherInDashboardRow = pathname === "/admin/dashboard"

  const facilitySwitcher =
    showFacilitySwitcher && !hideFacilitySwitcher && !facilitySwitcherInDashboardRow ? (
      <AdminFacilitySwitcher defaultFacilityId={defaultFacilityId} />
    ) : null

  const dashboardHref = buildAdminPathWithContext("/admin/dashboard", searchParams)

  return (
    <div className="flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden bg-brand-shell-bg text-brand-body">
      <ActivitySessionLogger />
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-border/20 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:h-16"
      >
        <div className="relative mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 md:gap-4">
          <div className="flex min-w-0 shrink-0 items-center">
            <span className="md:hidden">
              <WaikLogo href={dashboardHref} size="md" />
            </span>
            <span className="hidden md:inline">
              <WaikLogo href={dashboardHref} size="lg" />
            </span>
          </div>

          <nav className="absolute left-1/2 top-1/2 hidden w-auto max-w-[min(100%,52rem)] -translate-x-1/2 -translate-y-1/2 md:block">
            <ul className="flex flex-wrap items-center justify-center gap-6 lg:gap-8">
              {NAV_LINKS.map(({ label, href }) => {
                const active = navActive(pathname, href)
                const hrefWithContext = buildAdminPathWithContext(href, searchParams)
                return (
                  <li key={href}>
                    <Link
                      href={hrefWithContext}
                      className={cn(
                        "inline-block min-h-10 border-b-2 pb-0.5 text-sm font-medium transition-colors md:min-h-0",
                        active
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            {isWaikSuperAdmin ? (
              <Link
                href="/waik-admin"
                className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground md:px-2.5 md:py-2 md:text-sm"
              >
                <Shield className="h-4 w-4 shrink-0 text-primary md:h-4 md:w-4" strokeWidth={2} aria-hidden />
                <span className="max-w-[7rem] truncate sm:max-w-none">Platform admin</span>
              </Link>
            ) : null}
            <button
              type="button"
              className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center text-muted-foreground md:h-12 md:w-12"
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
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain pt-14 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6 md:pt-16"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isWaikSuperAdmin ? <SuperAdminAdminEntryTelemetry isWaikSuperAdmin /> : null}
        {facilitySwitcher}
        {children}
      </div>

      <AdminBottomNav />
    </div>
  )
}
