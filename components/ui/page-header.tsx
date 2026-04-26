import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight md:text-3xl">{title}</div>
        {description ? <div className="text-sm text-muted-foreground md:text-base">{description}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 sm:gap-3">{actions}</div> : null}
    </div>
  )
}

