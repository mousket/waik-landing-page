import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-background/80 p-8 text-center shadow-xl",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="text-lg font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      {actions ? <div className="mt-6 flex justify-center gap-2">{actions}</div> : null}
    </div>
  )
}

