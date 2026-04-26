"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import {
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/admin/incidents", label: "Incidents", icon: ClipboardList },
  { href: "/admin/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/admin/residents", label: "Residents", icon: Users },
  { href: "/admin/intelligence", label: "Intelligence", icon: Lightbulb },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const

function tabActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard"
  }
  if (href === "/admin/settings") {
    return pathname.startsWith("/admin/settings")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Mobile-only bottom navigation — same interaction model as the staff app (thumb zone, no hamburger).
 */
export function AdminBottomNav() {
  const pathname = usePathname()
  const searchParams = useAdminUrlSearchParams()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Admin navigation"
    >
      <div className="mx-auto flex min-h-[64px] w-full max-w-2xl items-stretch justify-between gap-0.5 px-0.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = tabActive(pathname, href)
          const hrefWithContext = buildAdminPathWithContext(href, searchParams)
          return (
            <Link
              key={href}
              href={hrefWithContext}
              className={cn(
                "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[9px] font-semibold leading-[1.15] transition-colors sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="line-clamp-2 max-w-[4.25rem] text-center sm:max-w-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
