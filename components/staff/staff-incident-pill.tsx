"use client"

import { format, isToday } from "date-fns"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { shortIncidentRef } from "@/lib/utils/pending-question-utils"
import { cn } from "@/lib/utils"
import { CompletionRing } from "@/components/shared/completion-ring"
import { PendingQuestionsBreakdown } from "@/components/staff/pending-questions-breakdown"
import { PhaseBadge } from "@/components/shared/phase-badge"

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function residentLine(inc: StaffIncidentSummary) {
  const n = (inc.residentName || "").trim()
  if (n && n !== "Resident") return n
  if (inc.residentRoom) return `Room ${inc.residentRoom}`
  return "Resident"
}

function pillAccent(inc: StaffIncidentSummary) {
  if (inc.hasInjury) return "border-l-[#C0392B]"
  if (inc.phase === "phase_1_in_progress") return "border-l-[#E8A838]"
  if (inc.phase === "phase_2_in_progress") return "border-l-[#2E86DE]"
  return "border-l-border/80"
}

export function StaffIncidentPill({
  incident,
  onSelect,
  mode,
  className,
}: {
  incident: StaffIncidentSummary
  onSelect: () => void
  mode: "work" | "all"
  className?: string
}) {
  const timeAgo = useHydrationSafeRelativeTime(incident.startedAt)
  const typeLabel = formatIncidentType(incident.incidentType)
  const started = new Date(incident.startedAt)
  const dateLabel = isToday(started) ? "Today" : format(started, "MMM d, yyyy")
  const reportedAtLabel = format(started, "MMM d, yyyy · h:mm a")
  const completeness = incident.completenessAtSignoff || incident.completenessScore
  const name = residentLine(incident)
  const reporter = (incident.reporterName || "").trim() || "Staff"
  const ref = shortIncidentRef(incident.id)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background to-accent/[0.06] p-3.5 pl-3 text-left shadow-sm transition",
        "hover:border-primary/40 hover:shadow-md active:scale-[0.99]",
        "border-l-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        pillAccent(incident),
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p
            className="min-w-0 flex-1 pr-0.5 text-left text-sm font-semibold leading-tight text-foreground sm:text-[0.9375rem] line-clamp-1 [overflow-wrap:anywhere]"
            title={name}
          >
            {name}
          </p>
          <p
            className="shrink-0 max-w-[55%] text-right text-sm font-extrabold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] sm:max-w-[50%] sm:text-[0.9rem]"
            title={typeLabel}
          >
            {typeLabel}
          </p>
        </div>
        <p className="text-xs font-medium leading-snug text-muted-foreground">
          Room {incident.residentRoom || "—"} · Ref {ref}
        </p>
        <p className="text-xs leading-snug text-muted-foreground">
          Reported by {reporter} · {reportedAtLabel}
        </p>
        <p className="text-[0.7rem] text-muted-foreground/90">{timeAgo}</p>
      </div>
      {incident.hasInjury ? (
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-destructive" aria-label="Injury reported">
          Injury reported
        </span>
      ) : null}

      {mode === "work" ? (
        <div className="mt-0.5 flex min-h-[4.5rem] min-w-0 items-start justify-between gap-2 border-t border-border/40 pt-2 sm:min-h-[5rem]">
          <div className="min-w-0 flex-1 pr-1">
            <PendingQuestionsBreakdown incident={incident} />
          </div>
          <div className="flex shrink-0 items-start pt-0.5">
            <CompletionRing percent={incident.completenessScore} size={36} strokeWidth={3} />
          </div>
        </div>
      ) : (
        <div className="mt-0.5 space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <PhaseBadge phase={incident.phase} size="sm" className="max-w-full truncate" />
            <span
              className="ml-auto shrink-0 text-sm font-bold tabular-nums text-foreground"
              aria-label={`${Math.round(completeness)}% complete`}
            >
              {Math.round(completeness)}%
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
