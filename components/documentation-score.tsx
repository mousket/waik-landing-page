"use client"

import { CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { CheckCircle2, AlertCircle, Clock, FileQuestion, Brain } from "lucide-react"

interface DocumentationScoreProps {
  completenessScore: number
  filledFields?: string[]
  missingFields?: string[]
  totalQuestions: number
  answeredQuestions: number
  pendingCriticalQuestions: number
  incidentCategory?: string
  incidentSubtype?: string
}

export function DocumentationScore({
  completenessScore,
  filledFields = [],
  missingFields = [],
  totalQuestions,
  answeredQuestions,
  pendingCriticalQuestions,
  incidentCategory,
  incidentSubtype,
}: DocumentationScoreProps) {
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <WaikCard className="border-primary/20">
      <WaikCardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              Documentation Score
            </CardTitle>
            <CardDescription>Gold standard compliance assessment</CardDescription>
          </div>
          <Badge
            variant={getScoreBadgeVariant(completenessScore)}
            className="w-fit shrink-0 px-3 py-1.5 text-base font-semibold sm:text-lg"
          >
            {completenessScore}%
          </Badge>
        </div>
      </WaikCardContent>
      <WaikCardContent className="space-y-4 border-t border-border/50 pt-4">
        {/* Main progress bar */}
        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(completenessScore)}`}
              style={{ width: `${completenessScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-amber-600 dark:text-amber-500">70% threshold</span>
            <span>100%</span>
          </div>
        </div>

        {/* Category info */}
        {incidentCategory && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Incident Type:</span>
            <Badge variant="outline" className="capitalize">
              {incidentCategory}
              {incidentSubtype && ` - ${incidentSubtype.replace("fall-", "")}`}
            </Badge>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1 rounded-2xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileQuestion className="h-4 w-4 shrink-0" aria-hidden />
              Questions
            </div>
            <p className="text-xl font-semibold tracking-tight">
              {answeredQuestions}/{totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">answered</p>
          </div>

          <div className="space-y-1 rounded-2xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              Critical Pending
            </div>
            <p
              className={`text-xl font-semibold tracking-tight ${
                pendingCriticalQuestions > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"
              }`}
            >
              {pendingCriticalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingCriticalQuestions > 0 ? "requires attention" : "all complete"}
            </p>
          </div>
        </div>

        {/* Filled fields summary */}
        {filledFields.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Documented ({filledFields.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filledFields.slice(0, 8).map((field) => (
                <Badge
                  key={field}
                  variant="secondary"
                  className="border border-primary/20 bg-primary/10 text-xs text-primary"
                >
                  {formatFieldName(field)}
                </Badge>
              ))}
              {filledFields.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{filledFields.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Missing fields summary */}
        {missingFields.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              Missing ({missingFields.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingFields.slice(0, 6).map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="border-amber-500/30 text-xs text-amber-800 dark:text-amber-200"
                >
                  {formatFieldName(field)}
                </Badge>
              ))}
              {missingFields.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{missingFields.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Completion status message */}
        <div
          className={`rounded-2xl border p-4 ${
            completenessScore >= 70
              ? "border-emerald-500/30 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-950/30"
              : "border-amber-500/30 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-950/20"
          }`}
        >
          {completenessScore >= 70 ? (
            <p className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Documentation meets the 70% threshold for completion.</span>
            </p>
          ) : (
            <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Additional information needed to reach 70% threshold. Follow-up questions have been generated.
              </span>
            </p>
          )}
        </div>
      </WaikCardContent>
    </WaikCard>
  )
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

