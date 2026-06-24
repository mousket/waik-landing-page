"use client"

import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import {
  buildPendingQuestionPhaseLines,
  getPendingQuestionHeadline,
} from "@/lib/utils/pending-question-utils"
import { cn } from "@/lib/utils"

export function PendingQuestionsBreakdown({
  incident,
  className,
}: {
  incident: StaffIncidentSummary
  className?: string
}) {
  const headline = getPendingQuestionHeadline(incident)
  const lines = buildPendingQuestionPhaseLines(incident)

  if (headline.tone === "ok") {
    return (
      <p className={cn("text-xs font-semibold text-emerald-800 dark:text-emerald-200", className)}>
        {headline.text}
      </p>
    )
  }

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p
        className={cn(
          "text-xs font-bold tabular-nums sm:text-sm",
          headline.tone === "deferred"
            ? "text-amber-900 dark:text-amber-200"
            : "text-red-900 dark:text-red-200",
        )}
      >
        {headline.text}
      </p>
      {lines ? (
        <ul className="space-y-0.5 text-[0.65rem] leading-snug text-muted-foreground sm:text-xs">
          {lines.map((line) => (
            <li key={line.label} className="flex min-w-0 gap-1.5">
              <span className="shrink-0 font-semibold text-foreground/80">{line.label}</span>
              <span
                className={cn(
                  "min-w-0 [overflow-wrap:anywhere]",
                  line.tone === "deferred" && "font-medium text-amber-800/90 dark:text-amber-300/90",
                )}
              >
                · {line.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
