"use client"

import { format, isToday } from "date-fns"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { getPendingQuestionCount } from "@/lib/utils/pending-question-utils"
import { cn } from "@/lib/utils"
import { CompletionRing } from "@/components/shared/completion-ring"
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

/** Shared height for “questions left” and “On track” (no filled chip background). */
const WORK_STATUS_LINE =
  "flex min-h-9 w-full min-w-0 max-w-full items-center justify-start px-0 py-1 text-left text-xs font-semibold tabular-nums leading-snug sm:min-h-10 sm:text-sm sm:leading-snug"

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
  const qRemaining =
    incident.phase === "phase_1_in_progress" ? getPendingQuestionCount(incident) : 0
  const started = new Date(incident.startedAt)
  const dateLabel = isToday(started) ? "Today" : format(started, "MMM d, yyyy")
  const completeness = incident.completenessAtSignoff || incident.completenessScore
  const name = residentLine(incident)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full min-w-0 flex-col gap-1.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background to-accent/[0.06] p-2.5 pl-2.5 text-left shadow-sm transition",
        "hover:border-primary/40 hover:shadow-md active:scale-[0.99]",
        "border-l-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        pillAccent(incident),
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p
            className="min-w-0 flex-1 pr-0.5 text-left text-[0.8125rem] font-semibold leading-tight text-foreground sm:text-sm line-clamp-1 [overflow-wrap:anywhere]"
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
        <p className="text-[0.7rem] font-medium leading-snug text-muted-foreground sm:text-xs">
          Room {incident.residentRoom} · {timeAgo}
        </p>
      </div>
      {incident.hasInjury ? (
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-destructive" aria-label="Injury reported">
          Injury reported
        </span>
      ) : null}

      {mode === "work" ? (
        <div className="mt-0.5 flex min-h-11 min-w-0 items-stretch justify-between gap-1.5 border-t border-border/40 pt-1.5 sm:min-h-12">
          <div className="flex min-w-0 flex-1 items-center pr-1">
            {qRemaining > 0 ? (
              <span
                className={cn(
                  WORK_STATUS_LINE,
                  "text-red-900 dark:text-red-200 [overflow-wrap:break-word]",
                )}
              >
                {qRemaining} question{qRemaining === 1 ? "" : "s"} left
              </span>
            ) : (
              <span className={cn(WORK_STATUS_LINE, "text-emerald-800 dark:text-emerald-200")}>On track</span>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            <CompletionRing percent={incident.completenessScore} size={32} strokeWidth={3} />
          </div>
        </div>
      ) : (
        <div className="mt-0.5 space-y-1.5 border-t border-border/40 pt-1.5">
          <p className="text-[0.7rem] font-medium text-muted-foreground sm:text-xs">{dateLabel}</p>
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
