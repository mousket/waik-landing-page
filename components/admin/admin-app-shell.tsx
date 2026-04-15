"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import { AdminMobileNav, type AdminMobileNavLink } from "@/components/admin/mobile-nav"

const NAV_LINKS: readonly AdminMobileNavLink[] = [
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

function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0)
  const b = lastName.trim().charAt(0)
  if (a && b) return (a + b).toUpperCase()
  if (a) return a.toUpperCase()
  return "?"
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
  const ini = initials(firstName, lastName)

  return (
    <div className="min-h-[100dvh] bg-brand-shell-bg text-brand-body">
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b bg-white px-4"
        style={{ borderColor: brand.midGray }}
      >
        <div className="relative mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="shrink-0 text-xl font-bold"
              style={{ color: brand.teal }}
            >
              WAiK
            </Link>
            <AdminMobileNav links={NAV_LINKS} />
          </div>

          <nav className="absolute left-1/2 top-1/2 hidden w-auto max-w-[min(100%,52rem)] -translate-x-1/2 -translate-y-1/2 md:block">
            <ul className="flex flex-wrap items-center justify-center gap-8">
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

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center"
              style={{ color: brand.muted }}
              aria-label="Notifications"
            >
              <Bell className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </button>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: brand.teal }}
              aria-hidden
            >
              {ini}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">{children}</div>
    </div>
  )
}
