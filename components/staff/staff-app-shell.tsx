"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Home, ClipboardList, ClipboardCheck, Lightbulb } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"

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

function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0)
  const b = lastName.trim().charAt(0)
  if (a && b) return (a + b).toUpperCase()
  if (a) return a.toUpperCase()
  return "?"
}

export function StaffAppShell({
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
    <div className="flex min-h-[100dvh] flex-col bg-brand-shell-bg text-brand-body">
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4"
        style={{ borderColor: brand.midGray }}
      >
        <span className="text-xl font-bold" style={{ color: brand.teal }}>
          WAiK
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center text-brand-muted"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: brand.teal }}
            aria-hidden
          >
            {ini}
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
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom,0px)]"
        style={{ borderColor: brand.midGray }}
        aria-label="Staff navigation"
      >
        <div className="mx-auto flex min-h-[64px] max-w-lg items-stretch">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = tabActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                  active ? "text-brand-teal" : "text-brand-muted",
                )}
              >
                <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
