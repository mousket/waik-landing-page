"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-amber-600"
    return "text-red-600"
  }

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
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Documentation Score
            </CardTitle>
            <CardDescription>Gold standard compliance assessment</CardDescription>
          </div>
          <Badge variant={getScoreBadgeVariant(completenessScore)} className="text-lg px-3 py-1">
            {completenessScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main progress bar */}
        <div className="space-y-2">
          <div className="relative pt-1">
            <Progress value={completenessScore} className="h-3" />
            <div
              className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(completenessScore)}`}
              style={{ width: `${completenessScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-amber-600">70% threshold</span>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileQuestion className="h-4 w-4" />
              Questions
            </div>
            <p className="text-xl font-semibold">
              {answeredQuestions}/{totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">answered</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Critical Pending
            </div>
            <p className={`text-xl font-semibold ${pendingCriticalQuestions > 0 ? "text-amber-600" : "text-green-600"}`}>
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
            <p className="text-sm font-medium flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Documented ({filledFields.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {filledFields.slice(0, 8).map((field) => (
                <Badge key={field} variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
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
            <p className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Missing ({missingFields.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {missingFields.slice(0, 6).map((field) => (
                <Badge key={field} variant="outline" className="text-xs border-amber-300 text-amber-700">
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
        <div className={`rounded-lg p-3 ${completenessScore >= 70 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
          {completenessScore >= 70 ? (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Documentation meets the 70% threshold for completion.
            </p>
          ) : (
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Additional information needed to reach 70% threshold.
              Follow-up questions have been generated.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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

