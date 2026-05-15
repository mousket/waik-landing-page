"use client"

import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { TrendsCardNoFacility, TrendsCardSkeleton } from "@/components/admin/admin-trends-card-states"
import { useTrendsCardData } from "@/components/admin/use-trends-card-data"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsWeeklyBriefSection } from "@/lib/types/trends-weekly-brief"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const BRIEF_CARD_CLASS =
  "relative rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-4 shadow-sm sm:p-5"

function BriefUpdatedLine({ generatedAt }: { generatedAt: string }) {
  const rel = useHydrationSafeRelativeTime(generatedAt)
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Updated {rel}</p>
  )
}

function BriefSection({
  section,
  searchParams,
}: {
  section: TrendsWeeklyBriefSection
  searchParams: URLSearchParams
}) {
  return (
    <section
      className="border-t border-border/40 pt-4 first:border-t-0 first:pt-0"
      aria-labelledby={`weekly-brief-${section.id}`}
    >
      <h3 id={`weekly-brief-${section.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {section.title}
      </h3>
      <ul className="mt-2 space-y-2">
        {section.bullets.map((bullet, i) => {
          const href = buildAdminPathWithContext(bullet.evidencePath, searchParams)
          return (
            <li key={`${section.id}-${i}`}>
              <Link
                href={href}
                scroll={false}
                className="group flex min-h-11 items-start gap-2 rounded-xl border border-border/60 bg-background/60 px-2.5 py-2 text-sm leading-relaxed text-foreground transition hover:border-primary/25 hover:bg-primary/5"
              >
                <span className="min-w-0 flex-1">{bullet.text}</span>
                <ArrowUpRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function AdminTrendsWeeklyBriefPanel({
  searchParams,
  className,
}: {
  trendsRange?: TrendsRangeKey
  searchParams: URLSearchParams
  facilityId?: string
  className?: string
}) {
  const { data, loading, hasFacility } = useTrendsCardData((s) => s.weeklyBrief)

  if (!hasFacility) {
    return (
      <div className={cn(BRIEF_CARD_CLASS, className)} role="status">
        <p className="text-sm text-muted-foreground">Select a facility to load the weekly brief.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn(BRIEF_CARD_CLASS, className)} aria-busy="true" aria-label="Loading weekly brief">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div id="trends-weekly-brief" className={cn(BRIEF_CARD_CLASS, className)} aria-label="Weekly brief">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Weekly brief</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Evidence-linked read on what changed, where risk is moving, and what to review next — compared to the
            prior period.
          </p>
        </div>
      </div>

      {data.generatedAt ? (
        <div className="mt-3">
          <BriefUpdatedLine generatedAt={data.generatedAt} />
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {data.sections.map((section) => (
          <BriefSection key={section.id} section={section} searchParams={searchParams} />
        ))}
      </div>
    </div>
  )
}
