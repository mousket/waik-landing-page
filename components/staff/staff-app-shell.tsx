"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { Bell, Home, ClipboardList, ClipboardCheck, Lightbulb } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl } from "@/lib/clerk-routes"
import { WaikLogo } from "@/components/waik-logo"
import { cn } from "@/lib/utils"
import { BadgePoller } from "@/components/staff/badge-poller"
import { BadgeProvider, useBadges } from "@/components/staff/badge-context"

const tabs = [
  { href: "/staff/dashboard", label: "Home", icon: Home },
  { href: "/staff/incidents", label: "Incidents", icon: ClipboardList },
  { href: "/staff/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/staff/intelligence", label: "Intelligence", icon: Lightbulb },
] as const

function tabActive(pathname: string, href: string): boolean {
  if (href === "/staff/dashboard") {
    return (
      pathname === "/staff/dashboard" ||
      pathname === "/staff" ||
      pathname.startsWith("/staff/report")
    )
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
      <BadgePoller />
      <ShellContents firstName={firstName} lastName={lastName} unitLabel={unitLabel} pathname={pathname}>
        {children}
      </ShellContents>
    </BadgeProvider>
  )
}

function Badge({ count }: { count: number }) {
  if (!count || count <= 0) return null
  return (
    <span className="absolute -right-2 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function ShellContents({
  firstName,
  lastName,
  unitLabel,
  pathname,
  children,
}: {
  firstName: string
  lastName: string
  unitLabel?: string | null
  pathname: string
  children: React.ReactNode
}) {
  const badges = useBadges()

  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-shell-bg text-brand-body">
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/20 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      >
        <WaikLogo href="/staff/dashboard" size="md" />
        <div className="flex items-center gap-3">
          {unitLabel ? (
            <span className="hidden rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
              {unitLabel}
            </span>
          ) : null}
          <button
            type="button"
            className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center text-brand-muted"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <div className="flex shrink-0 items-center [&_.cl-userButtonTrigger]:h-9 [&_.cl-userButtonTrigger]:w-9">
            <span className="sr-only">{`Signed in as ${[firstName, lastName].filter(Boolean).join(" ")}`}</span>
            <UserButton appearance={clerkAppearance} afterSignOutUrl={getClerkAfterSignOutUrl()} />
          </div>
        </div>
      </header>

      <main
        className="flex flex-1 flex-col overflow-y-auto overscroll-contain pt-14 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/20 bg-background/80 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
        aria-label="Staff navigation"
      >
        <div className="mx-auto flex min-h-[64px] max-w-lg items-stretch">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = tabActive(pathname, href)
            const count =
              href === "/staff/assessments"
                ? badges.dueAssessments
                : href === "/staff/dashboard" || href === "/staff/incidents"
                  ? badges.pendingQuestions
                  : 0

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                  active ? "text-brand-teal" : "text-brand-muted",
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                  <Badge count={count} />
                </span>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
