import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A “soft table” surface wrapper used for admin/back-office pages.
 * Intended to prevent harsh gridlines and inconsistent table framing.
 */
export function SoftTable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-3xl border border-border bg-background shadow-xl overflow-hidden", className)}>
      {children}
    </div>
  )
}

