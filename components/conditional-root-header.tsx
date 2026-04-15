"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

/**
 * Landing (`/`) uses `components/header.tsx` for auth controls on the right.
 * Omit this slim bar on the home page to avoid a duplicate row / misaligned avatar.
 */
export function ConditionalRootHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  if (pathname === "/" || pathname === "") {
    return null
  }

  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b border-border/40 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {children}
    </header>
  )
}
