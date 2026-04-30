"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SURFACE =
  "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background to-accent/[0.06] p-4 shadow-md sm:p-5"

/**
 * Compact header aligned with {@link StaffDashboardGreeting} / incidents queue surfaces.
 */
export function ReportStepHeader({
  eyebrow = "Incident report",
  title,
  description,
  className,
  trailing,
  back,
}: {
  eyebrow?: string
  title: string
  description?: string
  className?: string
  trailing?: ReactNode
  back?: { href: string; ariaLabel?: string } | { onClick: () => void; disabled?: boolean; ariaLabel?: string }
}) {
  return (
    <div className={cn(SURFACE, className)}>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/[0.08] blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-2">
        {back ? (
          "href" in back ? (
            <Button variant="ghost" size="icon" className="-ml-1 h-9 w-9 shrink-0 text-foreground" asChild>
              <Link href={back.href} aria-label={back.ariaLabel ?? "Back"}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-1 h-9 w-9 shrink-0 text-foreground"
              onClick={back.onClick}
              disabled={back.disabled}
              aria-label={back.ariaLabel ?? "Back"}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80 sm:text-xs">{eyebrow}</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
          {description ? <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </div>
  )
}
