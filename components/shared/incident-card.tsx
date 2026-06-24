"use client"

import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { shortIncidentRef } from "@/lib/utils/pending-question-utils"
import { PendingQuestionsBreakdown } from "@/components/staff/pending-questions-breakdown"
import { format, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { CompletionRing } from "@/components/shared/completion-ring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function leftBorderClass(inc: StaffIncidentSummary): string {
  if (inc.hasInjury) return "border-l-[#C0392B]"
  if (inc.phase === "phase_1_in_progress") return "border-l-[#E8A838]"
  if (inc.phase === "phase_2_in_progress") return "border-l-[#2E86DE]"
  return "border-l-border"
}

function residentHeading(incident: StaffIncidentSummary) {
  const n = (incident.residentName || "").trim()
  const hasName = Boolean(n && n !== "Resident")
  if (hasName) {
    return { primary: n, subRoom: `Room ${incident.residentRoom}` as string | null }
  }
  return { primary: `Room ${incident.residentRoom}`, subRoom: null as string | null }
}

/**
 * Active-work card for staff dashboard (Phase 5b). Admin “Needs attention” uses a denser
 * grid layout in `needs-attention-tab.tsx`; this component targets the staff mobile flow.
 */
export function IncidentCard({
  incident,
  onContinue,
  reporterLabel = "You",
}: {
  incident: StaffIncidentSummary
  onContinue: () => void
  /** Shown as “Reported by …” — staff reports are typically the current user. */
  reporterLabel?: string
}) {
  const timeAgo = useHydrationSafeRelativeTime(incident.startedAt)
  const { primary: headingPrimary, subRoom } = residentHeading(incident)
  const typeLabel = formatIncidentType(incident.incidentType)
  const started = new Date(incident.startedAt)
  const reportedAtLabel = isToday(started)
    ? `Today · ${format(started, "h:mm a")}`
    : format(started, "MMM d, yyyy · h:mm a")
  const reporter = (incident.reporterName || reporterLabel).trim() || "Staff"

  return (
    <article>
      <WaikCard
        variant="base"
        hover="lift"
        className={cn("border-l-4 bg-card", leftBorderClass(incident))}
      >
        <WaikCardContent className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground line-clamp-1">{headingPrimary}</p>
              {subRoom ? <p className="text-xs text-muted-foreground">{subRoom}</p> : null}
            </div>
            <Badge className="shrink-0 border-0 bg-primary font-medium text-primary-foreground">
              {typeLabel}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {incident.hasInjury ? (
              <span className="text-destructive">Injury reported</span>
            ) : (
              <span>No injury reported</span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reported by {reporter} · {reportedAtLabel}
          </p>
          <p className="text-[0.7rem] text-muted-foreground/90">
            Ref {shortIncidentRef(incident.id)} · {timeAgo}
          </p>
          <div className="mt-2">
            <PendingQuestionsBreakdown incident={incident} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CompletionRing
              percent={incident.completenessScore}
              size={40}
              strokeWidth={3}
            />
            <Button
              type="button"
              className="min-h-12 shrink-0 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={onContinue}
            >
              Continue report
            </Button>
          </div>
        </WaikCardContent>
      </WaikCard>
    </article>
  )
}
