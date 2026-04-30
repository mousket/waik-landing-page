"use client"

import { Check } from "lucide-react"

import { CompletionRing } from "@/components/shared/completion-ring"
import { ReportStepHeader } from "@/components/staff/report-step-header"
import { cn } from "@/lib/utils"

export interface BoardQuestion {
  id: string
  text: string
  label: string
  areaHint: string
  tier: string
  allowDefer: boolean
  required: boolean
}

interface QuestionBoardProps {
  title: string
  questions: BoardQuestion[]
  answeredIds: Set<string>
  answers: Record<string, string>
  completenessScore: number
  onQuestionTap: (question: BoardQuestion) => void
  onDeferAll?: () => void
  isSubmitting: boolean
  removedIds?: string[]
  newIds?: string[]
  className?: string
}

export function QuestionBoard({
  title,
  questions,
  answeredIds,
  answers,
  completenessScore,
  onQuestionTap,
  onDeferAll,
  isSubmitting,
  removedIds = [],
  newIds = [],
  className,
}: QuestionBoardProps) {
  const removed = new Set(removedIds)
  const newlyAdded = new Set(newIds)
  const remaining = questions.filter((q) => !answeredIds.has(q.id)).length

  return (
    <div className={cn("flex min-h-0 min-w-0 max-md:flex-none flex-1 flex-col", className)}>
      <div className="px-3 pt-3 sm:px-4 sm:pt-4 md:mx-auto md:w-full md:max-w-4xl lg:max-w-5xl">
        <ReportStepHeader
          eyebrow="Voice reporting"
          title={title}
          description={`${remaining} question${remaining !== 1 ? "s" : ""} remaining`}
          trailing={<CompletionRing percent={completenessScore} size={48} strokeWidth={3.5} showLabel />}
        />
      </div>

      <div className="mx-auto w-full max-w-lg max-md:flex-none max-md:overflow-visible px-3 py-3 pb-28 sm:px-4 sm:py-4 sm:pb-32 md:min-h-0 md:max-w-4xl md:flex-1 md:overflow-y-auto md:overscroll-contain md:pb-28 lg:max-w-5xl">
        <div className="grid grid-cols-1 gap-2 sm:gap-2.5 md:grid-cols-2 md:gap-3">
          {questions.map((q) => {
            const isAnswered = answeredIds.has(q.id)
            const isRemoved = removed.has(q.id)
            const isNew = newlyAdded.has(q.id)
            const raw = answers[q.id]?.trim() ?? ""
            const snippet = raw ? `${raw.slice(0, 80)}${raw.length > 80 ? "…" : ""}` : null

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => !isSubmitting && !isRemoved && onQuestionTap(q)}
                disabled={isSubmitting || isRemoved}
                className={cn(
                  "flex h-full min-h-[3.75rem] w-full items-start gap-2.5 rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.03] via-background to-accent/[0.02] p-3.5 text-left shadow-sm transition-all duration-300 sm:min-h-16 sm:gap-3 sm:p-4 md:min-h-[4.5rem]",
                  "touch-manipulation",
                  isRemoved && "pointer-events-none scale-95 opacity-0",
                  isNew && "animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isAnswered
                    ? "border-emerald-200/90 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                    : "hover:border-primary/25 hover:shadow-md dark:border-border dark:from-card dark:to-card",
                  isSubmitting && "cursor-wait opacity-60",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
                    isAnswered ? "bg-emerald-500 text-white" : "border-2 border-primary/20 dark:border-muted-foreground/40",
                  )}
                  aria-hidden
                >
                  {isAnswered ? <Check className="h-3.5 w-3.5 stroke-[3] sm:h-4 sm:w-4" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      isAnswered ? "text-emerald-900 dark:text-emerald-100" : "text-foreground",
                    )}
                  >
                    {q.text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{q.areaHint}</p>
                  {snippet ? (
                    <p className="mt-1.5 line-clamp-2 text-xs italic text-emerald-800 dark:text-emerald-200">
                      “{snippet}”
                    </p>
                  ) : null}
                </div>
                {!isAnswered && !isRemoved ? (
                  <span className="mt-1 shrink-0 text-muted-foreground/50" aria-hidden>
                    ›
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {onDeferAll ? (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border/60 bg-background/90 px-3 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 dark:bg-card/90 md:mx-auto md:max-w-4xl md:rounded-t-xl md:border-x md:border-t lg:max-w-5xl">
          <button
            type="button"
            onClick={onDeferAll}
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl border border-primary/35 bg-primary/[0.04] py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.08] disabled:opacity-50 sm:min-h-12 sm:text-base"
          >
            Answer later — save and continue on your shift
          </button>
        </div>
      ) : null}
    </div>
  )
}
