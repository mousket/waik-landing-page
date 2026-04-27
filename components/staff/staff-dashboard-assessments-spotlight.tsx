"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronDown, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type SpotlightAssessment = {
  id: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: string
  daysUntilDue: number
}

function typeLabel(t: string) {
  if (!t) return "Assessment"
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
}

function assessmentHref(a: SpotlightAssessment) {
  const type = encodeURIComponent(a.assessmentType)
  const q = new URLSearchParams({
    residentId: a.residentId,
    residentName: (a.residentName || "Resident").trim() || "Resident",
    residentRoom: a.residentRoom || "",
  })
  return `/staff/assessments/${type}?${q.toString()}`
}

function dueBadge(d: number) {
  if (d <= 0) return "Due today"
  if (d === 1) return "1 day"
  return `${d} days`
}

const SHELL =
  "min-h-0 overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-500/[0.08] via-background to-primary/[0.06] shadow-md"

/**
 * Primary dashboard band for scheduled assessments — collapsible like My work queue.
 */
export function StaffDashboardAssessmentsSpotlight({
  assessments,
  loading,
}: {
  assessments: SpotlightAssessment[]
  loading: boolean
}) {
  const [open, setOpen] = useState(true)
  const byType = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of assessments) {
      const k = (a.assessmentType || "other").toLowerCase()
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [assessments])

  if (loading) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={SHELL}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-h-14 items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-emerald-500/[0.06] sm:px-5 sm:py-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800/90 dark:text-emerald-200/90">
                  Assessments on your radar
                </p>
                <p className="mt-1.5 text-sm font-semibold text-foreground sm:text-base">Loading…</p>
              </div>
              <ChevronDown
                className={cn("size-5 shrink-0 text-emerald-800 transition-transform dark:text-emerald-200", open && "rotate-180")}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border-t border-border/50 px-3 pb-5 pt-3 sm:px-5 sm:pb-6">
              <Skeleton className="h-3 w-full max-w-md" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  if (assessments.length === 0) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="min-h-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/15 shadow-sm">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-h-14 items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-muted/30 sm:px-5 sm:py-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800/90 dark:text-emerald-200/90">
                  Assessments on your radar
                </p>
                <p className="mt-1.5 text-sm font-semibold text-foreground sm:text-base">Nothing due in the next week</p>
              </div>
              <ChevronDown
                className={cn("size-5 shrink-0 text-primary transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border-t border-border/50 px-3 pb-5 pt-3 sm:px-5 sm:pb-6">
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                When residents have scheduled activity, dietary, behavioral, or clinical reviews, they will show here
                with the same priority as open incident work.
              </p>
              <Button asChild variant="outline" size="sm" className="min-h-9">
                <Link href="/staff/assessments">Assessment hub</Link>
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  const preview = assessments.slice(0, 6)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={cn(SHELL, "min-h-0 scroll-mt-6")}
        aria-labelledby="staff-dash-assessments-heading"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full min-h-14 items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-emerald-500/[0.06] sm:px-5 sm:py-4"
          >
            <div>
              <p
                id="staff-dash-assessments-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800/90 dark:text-emerald-200/90"
              >
                Assessments on your radar
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground sm:text-base">
                {assessments.length} due in the next week
              </p>
            </div>
            <ChevronDown
              className={cn("size-5 shrink-0 text-emerald-800 transition-transform dark:text-emerald-200", open && "rotate-180")}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/50 px-3 pb-6 pt-2 sm:px-5 sm:pb-8">
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Scheduled resident reviews belong on the command center alongside incidents. Start from a tile below or
              open the full schedule.
            </p>
            {byType.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Due counts by type">
                {byType.map(([type, n]) => (
                  <li
                    key={type}
                    className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/60 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100 sm:text-xs"
                  >
                    {typeLabel(type)} · {n}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button asChild className="h-9 w-full px-4 text-xs font-semibold sm:h-10 sm:w-auto sm:self-end sm:text-sm">
                <Link href="/staff/assessments">
                  <Stethoscope className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  All due
                </Link>
              </Button>
            </div>

            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((a) => {
                const d = Number(a.daysUntilDue ?? 0)
                return (
                  <li key={a.id} className="min-w-0">
                    <Link
                      href={assessmentHref(a)}
                      className="flex min-h-[3.25rem] flex-col justify-center gap-0.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-left shadow-xs transition hover:border-primary/30 hover:bg-primary/[0.04]"
                    >
                      <span className="truncate text-sm font-semibold text-foreground">
                        {(a.residentName || "").trim() || "Resident"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {typeLabel(a.assessmentType)}
                        {a.residentRoom ? ` · Room ${a.residentRoom}` : ""}
                      </span>
                      <span
                        className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-bold sm:text-[0.7rem] ${
                          d <= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {dueBadge(d)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {assessments.length > preview.length ? (
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                +{assessments.length - preview.length} more in the full list — see sidebar or{" "}
                <Link href="/staff/assessments" className="font-semibold text-primary underline-offset-2 hover:underline">
                  Assessment hub
                </Link>
                .
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
