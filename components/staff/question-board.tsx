"use client"

import { CompletionRing } from "@/components/shared/completion-ring"
import { cn } from "@/lib/utils"

export interface BoardQuestion {
  id: string
  text: string
  label: string
  areaHint?: string
  tier: "tier1" | "tier2" | "closing"
  allowDefer: boolean
  required?: boolean
}

export interface QuestionBoardProps {
  title: string
  questions: BoardQuestion[]
  answeredIds: Set<string>
  answers: Record<string, string>
  completenessScore: number
  onQuestionTap: (question: BoardQuestion) => void
  onDeferAll?: () => void
  isSubmitting: boolean
  removedIds?: string[]
  className?: string
}

const HEADER_BG = "bg-[#0A3D40]"
const SNIPPET_LIMIT = 80

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
  className,
}: QuestionBoardProps) {
  const remaining = questions.filter((q) => !answeredIds.has(q.id)).length

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div
        className={cn(
          HEADER_BG,
          "w-full px-5 py-4 text-white md:mx-auto md:max-w-lg md:rounded-b-2xl",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white">{title}</h1>
            <p className="mt-0.5 text-sm text-white/60">
              {remaining} question{remaining !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <CompletionRing percent={completenessScore} size={52} strokeWidth={4} showLabel />
        </div>
      </div>

      {/* ── QUESTION CARDS ─────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-4 py-4",
          onDeferAll ? "pb-32" : "pb-8",
          "md:mx-auto md:w-full md:max-w-lg",
        )}
      >
        {questions.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Loading questions…
          </p>
        )}

        {questions.map((q) => {
          const isAnswered = answeredIds.has(q.id)
          const isRemoved = removedIds.includes(q.id)
          const rawAnswer = answers[q.id]
          const snippet =
            rawAnswer && rawAnswer !== "__DEFERRED__"
              ? rawAnswer.slice(0, SNIPPET_LIMIT) +
                (rawAnswer.length > SNIPPET_LIMIT ? "…" : "")
              : null

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                if (!isSubmitting && !isAnswered && !isRemoved) onQuestionTap(q)
              }}
              disabled={isSubmitting || isAnswered || isRemoved}
              aria-label={
                isAnswered ? `${q.label}: answered. ${q.text}` : `${q.label}: ${q.text}`
              }
              className={cn(
                "flex w-full min-h-16 items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300",
                isRemoved &&
                  "h-0 scale-95 overflow-hidden border-0 p-0 opacity-0",
                !isRemoved && isAnswered && "border-emerald-200 bg-emerald-50",
                !isRemoved &&
                  !isAnswered &&
                  "border-gray-200 bg-white hover:border-[#0D7377] hover:shadow-sm",
                isSubmitting && !isAnswered && "cursor-wait opacity-60",
              )}
            >
              {/* Status indicator */}
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                  isAnswered
                    ? "bg-emerald-500 text-white"
                    : "border-2 border-gray-300",
                )}
                aria-hidden
              >
                {isAnswered && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Question content */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    isAnswered ? "text-emerald-900" : "text-[#1E2B2C]",
                  )}
                >
                  {q.text}
                </p>
                {q.areaHint && (
                  <p className="mt-1 text-xs text-[#5A7070]">{q.areaHint}</p>
                )}
                {snippet && (
                  <p className="mt-1.5 line-clamp-2 text-xs italic text-emerald-700">
                    &ldquo;{snippet}&rdquo;
                  </p>
                )}
              </div>

              {/* Tap arrow */}
              {!isAnswered && !isRemoved && (
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* ── BOTTOM BAR (Tier 2 only) ──────────────────────────── */}
      {onDeferAll && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 md:mx-auto md:max-w-lg">
          <button
            type="button"
            onClick={onDeferAll}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl border-2 border-[#0D7377] py-3 text-center font-semibold text-[#0D7377] transition-colors hover:bg-[#EEF8F8]",
              isSubmitting && "cursor-wait opacity-60",
            )}
          >
            Answer Later — save and continue on your shift
          </button>
        </div>
      )}
    </div>
  )
}
