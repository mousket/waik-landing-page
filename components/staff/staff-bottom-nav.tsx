"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ClipboardList, ClipboardCheck, Lightbulb, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBadges } from "@/components/staff/badge-context"

const tabs = [
  { href: "/staff/dashboard", label: "Home", icon: Home },
  { href: "/staff/incidents", label: "Incidents", icon: ClipboardList },
  { href: "/staff/residents", label: "Residents", icon: Users },
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
  if (href === "/staff/residents") {
    return pathname.startsWith("/staff/residents") || pathname.startsWith("/residents/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null
  return (
    <span className="absolute -right-2 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  )
}

/**
 * Mobile-only — matches admin bottom nav: thumb reach on small screens while top nav is hidden.
 */
export function StaffBottomNav() {
  const pathname = usePathname()
  const badges = useBadges()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Staff navigation"
    >
      <div className="mx-auto flex min-h-[64px] w-full max-w-2xl items-stretch justify-between gap-0.5 px-0.5">
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
                "relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[9px] font-semibold leading-[1.15] transition-colors sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <NavBadge count={count} />
              </span>
              <span className="line-clamp-2 max-w-[4.25rem] text-center sm:max-w-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
