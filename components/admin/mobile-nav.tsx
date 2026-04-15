"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"

export type AdminMobileNavLink = { label: string; href: string }

function linkActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard"
  }
  if (href === "/admin/settings") {
    return pathname.startsWith("/admin/settings")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminMobileNav({ links }: { links: readonly AdminMobileNavLink[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-md"
        style={{ color: brand.teal }}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open ? (
        <div
          className="fixed left-0 right-0 top-16 z-50 border-b bg-white shadow-lg"
          style={{ borderColor: brand.midGray }}
        >
          <nav className="flex flex-col py-1">
            {links.map(({ label, href }) => {
              const active = linkActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-[48px] items-center px-4 text-sm font-medium",
                    active ? "border-l-4 bg-brand-light-bg/80" : "border-l-4 border-transparent text-brand-muted",
                  )}
                  style={active ? { borderLeftColor: brand.teal, color: brand.teal } : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      ) : null}
    </div>
  )
}
