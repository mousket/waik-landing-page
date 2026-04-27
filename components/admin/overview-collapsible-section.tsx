"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OverviewCollapsibleSection({
  title,
  right,
  defaultOpen = true,
  children,
  className,
  id,
  headingClassName,
}: {
  title: ReactNode
  right?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  id?: string
  headingClassName?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-[3rem] w-full min-w-0 items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5 sm:px-3 sm:py-2",
          !open && "border-b-0",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto min-h-11 max-w-full flex-1 items-center justify-start gap-2 rounded-xl px-2 py-2 sm:px-3",
            "text-foreground",
            "hover:!bg-transparent hover:!text-foreground dark:hover:!bg-transparent",
            "focus-visible:bg-transparent focus-visible:ring-1 focus-visible:ring-border/60",
            headingClassName,
          )}
          onClick={() => {
            setOpen((o) => !o)
          }}
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open ? "rotate-0" : "-rotate-90")}
            aria-hidden
          />
          <span className="min-w-0 text-left text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
            {title}
          </span>
        </Button>
        {right
          ? (
              <div className="flex shrink-0 items-center gap-2 pr-0.5 sm:pr-1" onClick={(e) => e.stopPropagation()}>
                {right}
              </div>
            )
          : null}
      </div>
      {open
        ? (
            <div className="px-2 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
              {children}
            </div>
          )
        : null}
    </section>
  )
}
