import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  assessmentStatusBadgeClass,
  buildStaffAssessmentHref,
  displayAssessmentStatus,
  displayAssessmentType,
  getAssessmentDueUrgency,
} from "@/lib/assessments/presentation"
import type { AssessmentSummary } from "@/lib/types/assessment-summary"
import { cn } from "@/lib/utils"

function DueBadges({ assessment }: { assessment: AssessmentSummary }) {
  const urgency = getAssessmentDueUrgency(assessment.nextDueAt, assessment.status)
  if (!assessment.nextDueAt) return <span>—</span>

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="whitespace-nowrap text-foreground/90">{new Date(assessment.nextDueAt).toLocaleString()}</span>
      {urgency === "overdue" ? (
        <Badge variant="outline" className="w-fit border-amber-500/50 text-xs font-normal text-amber-800 dark:text-amber-200">
          Overdue
        </Badge>
      ) : null}
      {urgency === "due_soon" ? (
        <Badge variant="outline" className="w-fit border-primary/40 text-xs font-normal text-primary">
          Due soon
        </Badge>
      ) : null}
    </div>
  )
}

export function AssessmentSummaryList({
  rows,
  loading,
  variant,
  emptyTitle,
  emptyDescription,
  getAdminHref,
}: {
  rows: AssessmentSummary[]
  loading: boolean
  variant: "admin" | "staff"
  emptyTitle: string
  emptyDescription: string
  getAdminHref?: (assessment: AssessmentSummary) => string | null
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3 rounded-xl" />
        {Array.from({ length: variant === "admin" ? 6 : 4 }).map((_, index) => (
          <Skeleton key={index} className={variant === "admin" ? "h-12 w-full rounded-xl" : "h-24 w-full rounded-2xl"} />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  if (variant === "staff") {
    return (
      <ul className="space-y-3">
        {rows.map((assessment) => {
          const href = buildStaffAssessmentHref(assessment)
          return (
            <li
              key={assessment.id}
              className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {(assessment.residentName || "").trim() || "Resident"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {displayAssessmentType(assessment.assessmentType)}
                    {assessment.residentRoom ? ` · Room ${assessment.residentRoom}` : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("font-normal capitalize", assessmentStatusBadgeClass(assessment.status))}
                >
                  {displayAssessmentStatus(assessment.status)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1">
                  {assessment.conductedByName || "Unassigned"}
                </span>
                <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1">
                  {Math.round(assessment.completenessScore ?? 0)}% complete
                </span>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <DueBadges assessment={assessment} />
              </div>
              <div className="mt-4">
                {href ? (
                  <Button asChild className="min-h-12 w-full font-semibold shadow-lg shadow-primary/15">
                    <Link href={href}>Start assessment</Link>
                  </Button>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                    This assessment type is visible here, but the staff voice flow is not available for it yet.
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
            <th className="px-4 py-3">Resident / room</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Next due</th>
            <th className="px-4 py-3">By</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assessment) => {
            const href = getAdminHref?.(assessment) ?? null
            return (
              <tr
                key={assessment.id}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-medium">
                  <div className="min-w-0">
                    <p className="truncate">{(assessment.residentName || "").trim() || "Resident"}</p>
                    <p className="text-xs text-muted-foreground">
                      {assessment.residentRoom ? `Room ${assessment.residentRoom}` : "—"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{displayAssessmentType(assessment.assessmentType)}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn("font-normal capitalize", assessmentStatusBadgeClass(assessment.status))}
                  >
                    {displayAssessmentStatus(assessment.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <DueBadges assessment={assessment} />
                </td>
                <td className="px-4 py-3">{assessment.conductedByName || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{Math.round(assessment.completenessScore ?? 0)}</td>
                <td className="px-4 py-3">
                  {href ? (
                    <Button variant="outline" size="sm" className="min-h-10 border-primary/30" asChild>
                      <Link href={href}>View resident</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
