"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Sparkles, X } from "lucide-react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type DailyBriefApiPayload = {
  text: string
  generatedAt: string
  facilityId?: string
}

function todayKey() {
  return new Date().toISOString().split("T")[0] ?? ""
}

export function dismissStorageKey() {
  return `waik-brief-dismissed-${todayKey()}`
}

function firstNameFromDisplay(userDisplayName: string) {
  return userDisplayName.trim().split(/\s+/)[0] || "there"
}

/** Local time: morning 4:00–11:59, afternoon 12:00–17:59, evening 18:00–3:59. */
function salutationFromHour(h: number): string {
  if (h >= 4 && h < 12) return "Good morning"
  if (h >= 12 && h < 18) return "Good afternoon"
  return "Good evening"
}

/** Prominent welcome line — always shown at the top of the dashboard. */
export function AdminDashboardGreeting({
  userDisplayName,
  scopeHealthLine,
}: {
  userDisplayName: string
  scopeHealthLine?: string | null
}) {
  const first = firstNameFromDisplay(userDisplayName)
  // Same on server and first client paint; salutation() uses local time only after mount (avoids hydration mismatch).
  const [greet, setGreet] = useState("Hello")

  useEffect(() => {
    setGreet(salutationFromHour(new Date().getHours()))
  }, [])

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-background to-accent/[0.08] p-5 shadow-md sm:p-6 md:p-7">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute -bottom-6 left-1/3 h-24 w-40 rounded-full bg-accent/10 blur-2xl" aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Command center</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
        {greet}, {first}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {"Here's what needs your attention at this facility today."}
      </p>
      {scopeHealthLine ? (
        <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-foreground/90">{scopeHealthLine}</p>
      ) : null}
    </div>
  )
}

const BRIEF_CARD_CLASS =
  "relative rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-4 shadow-sm sm:p-5"

function formatIncidentTypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function incidentEvidenceRows(incidents: IncidentSummary[], max = 6): IncidentSummary[] {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  const recent = incidents.filter((i) => {
    const t = new Date(i.startedAt).getTime()
    return !Number.isNaN(t) && t >= cutoff
  })
  if (recent.length > 0) {
    return recent.slice(0, max)
  }
  return incidents
    .filter((i) => i.phase !== "closed")
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, max)
}

function BriefUpdatedLine({ generatedAt }: { generatedAt: string }) {
  const rel = useHydrationSafeRelativeTime(generatedAt)
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Updated {rel}
    </p>
  )
}

export function DailyBriefPanel({
  userDisplayName,
  payload,
  loading,
  error,
  stats,
  statsLoading,
  incidents,
  searchParams,
  onDismiss,
  className,
}: {
  userDisplayName: string
  stats: DashboardStats | null
  statsLoading: boolean
  incidents: IncidentSummary[]
  searchParams: URLSearchParams
  payload: DailyBriefApiPayload | null
  loading: boolean
  error: string | null
  onDismiss: () => void
  className?: string
}) {
  const first = firstNameFromDisplay(userDisplayName)
  const intelligenceHref = useMemo(() => buildAdminPathWithContext("/admin/intelligence", searchParams), [searchParams])
  const incidentsListHref = useMemo(() => buildAdminPathWithContext("/admin/incidents", searchParams), [searchParams])

  const narrativeBlocks = useMemo(() => {
    const raw = (payload?.text || "").trim()
    if (!raw) return []
    return raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
  }, [payload?.text])

  const evidence = useMemo(() => incidentEvidenceRows(incidents), [incidents])

  if (loading) {
    return (
      <div className={cn(BRIEF_CARD_CLASS, className)} aria-busy="true" aria-label="Loading daily brief">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-20 w-full" />
        <Skeleton className="mt-3 h-3 w-2/3" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(BRIEF_CARD_CLASS, className)} role="alert">
        <p className="text-sm font-semibold text-foreground">Daily brief</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn(BRIEF_CARD_CLASS, "pr-12", className)}>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label="Dismiss daily brief for today"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Daily brief</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{first}</span>, here is a concise read on recent activity and
            where to dig in.
          </p>
        </div>
      </div>

      {payload?.generatedAt ? (
        <div className="mt-3">
          <BriefUpdatedLine generatedAt={payload.generatedAt} />
        </div>
      ) : null}

      <section className="mt-4 border-t border-border/40 pt-4" aria-labelledby="daily-brief-narrative-heading">
        <h3 id="daily-brief-narrative-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Narrative
        </h3>
        {narrativeBlocks.length > 0 ? (
          <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-foreground/95">
            {narrativeBlocks.map((block, i) => (
              <p key={i} className="whitespace-pre-wrap break-words">
                {block}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No narrative is available yet for this facility.</p>
        )}
      </section>

      <section className="mt-4 border-t border-border/40 pt-4" aria-labelledby="daily-brief-metrics-heading">
        <h3 id="daily-brief-metrics-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          30-day documentation
        </h3>
        {statsLoading ? (
          <Skeleton className="mt-2 h-12 w-full" />
        ) : stats ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{stats.totalIncidents30d}</span> incident
            {stats.totalIncidents30d === 1 ? "" : "s"} in the last 30 days with{" "}
            <span className="font-semibold tabular-nums text-primary">{stats.avgCompleteness30d}%</span> average
            completeness.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Stats are still loading or unavailable.</p>
        )}
      </section>

      <section className="mt-4 border-t border-border/40 pt-4" aria-labelledby="daily-brief-evidence-heading">
        <h3 id="daily-brief-evidence-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Open reports (evidence)
        </h3>
        {evidence.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No open pipeline incidents in this view right now.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {evidence.map((inc) => {
              const href = buildAdminPathWithContext(`/admin/incidents/${encodeURIComponent(inc.id)}`, searchParams)
              const who = (inc.residentName || "").trim() || (inc.residentRoom ? `Room ${inc.residentRoom}` : "Resident")
              return (
                <li key={inc.id}>
                  <Link
                    href={href}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-2.5 py-2 text-sm font-medium text-foreground transition hover:border-primary/25 hover:bg-primary/5"
                  >
                    <span className="min-w-0 truncate" title={who}>
                      {formatIncidentTypeLabel(inc.incidentType)} · {who}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-xl border-border/60 text-xs font-semibold">
            <Link href={incidentsListHref}>All incidents</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 rounded-xl border-border/60 text-xs font-semibold">
            <Link href={intelligenceHref} className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Ask intelligence
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
