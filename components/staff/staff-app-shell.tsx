"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { Bell } from "lucide-react"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"
import { WaikLogo } from "@/components/waik-logo"
import { cn } from "@/lib/utils"
import { BadgePoller } from "@/components/staff/badge-poller"
import { ActivitySessionLogger } from "@/components/activity-session-logger"
import { BadgeProvider } from "@/components/staff/badge-context"
import { StaffBottomNav } from "@/components/staff/staff-bottom-nav"

const NAV_LINKS = [
  { label: "Dashboard", href: "/staff/dashboard" },
  { label: "Incidents", href: "/staff/incidents" },
  { label: "Assessments", href: "/staff/assessments" },
  { label: "Residents", href: "/staff/residents" },
  { label: "Intelligence", href: "/staff/intelligence" },
] as const

function navActive(pathname: string, href: string): boolean {
  if (href === "/staff/dashboard") {
    return (
      pathname === "/staff/dashboard" ||
      pathname === "/staff" ||
      pathname.startsWith("/staff/report")
    )
  }
  if (href === "/staff/residents") {
    return pathname.startsWith("/staff/residents") || pathname.startsWith("/residents/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function StaffAppShell({
  firstName,
  lastName,
  unitLabel,
  children,
}: {
  firstName: string
  lastName: string
  unitLabel?: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <BadgeProvider>
      <ActivitySessionLogger />
      <BadgePoller />
      <div className="flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden bg-brand-shell-bg text-brand-body">
        <header
          className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-border/20 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:h-16"
        >
          <div className="relative mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 md:gap-4">
            <div className="flex min-w-0 shrink-0 items-center">
              <span className="md:hidden">
                <WaikLogo href="/staff/dashboard" size="md" />
              </span>
              <span className="hidden md:inline">
                <WaikLogo href="/staff/dashboard" size="lg" />
              </span>
            </div>

            <nav
              className="absolute left-1/2 top-1/2 hidden w-auto max-w-[min(100%,40rem)] -translate-x-1/2 -translate-y-1/2 md:block"
              aria-label="Primary"
            >
              <ul className="flex flex-wrap items-center justify-center gap-5 lg:gap-7">
                {NAV_LINKS.map(({ label, href }) => {
                  const active = navActive(pathname, href)
                  return (
                    <li key={href}>
                      <Link
                        href={href}
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
              {unitLabel ? (
                <span className="hidden max-w-[10rem] truncate rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary sm:inline-flex md:max-w-[14rem]">
                  {unitLabel}
                </span>
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
          className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain pt-14 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:pb-6 md:pt-16"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>

        <StaffBottomNav />
      </div>
    </BadgeProvider>
  )
}
