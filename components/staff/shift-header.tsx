"use client"

import { cn } from "@/lib/utils"

function timeOfDayGreeting(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

export function ShiftHeader({
  firstName,
  selectedUnit,
  pendingCount,
  inProgressCount,
  assessmentsDueCount,
  onPendingChipClick,
  onInProgressChipClick,
  onAssessmentsChipClick,
  className,
}: {
  firstName: string
  selectedUnit: string | null
  pendingCount: number
  inProgressCount: number
  assessmentsDueCount: number
  onPendingChipClick: () => void
  onInProgressChipClick: () => void
  onAssessmentsChipClick: () => void
  className?: string
}) {
  const greet = timeOfDayGreeting()
  const name = firstName?.trim() || "there"

  return (
    <div
      className={cn(
        "w-full bg-[#0A3D40] px-5 py-5 text-white md:mx-auto md:max-w-lg md:rounded-b-2xl",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-white">
          Good {greet}, {name}
        </h1>
        {selectedUnit ? (
          <span
            className="inline-flex max-w-full items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-sm font-medium text-white"
            title={selectedUnit}
          >
            {selectedUnit}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pendingCount > 0 ? (
          <button
            type="button"
            onClick={onPendingChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-left text-sm font-medium text-red-800 transition active:scale-[0.99] sm:min-h-11"
          >
            {pendingCount} pending
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            All caught up
          </span>
        )}

        {inProgressCount > 0 ? (
          <button
            type="button"
            onClick={onInProgressChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-left text-sm font-medium text-amber-900 transition active:scale-[0.99] sm:min-h-11"
          >
            {inProgressCount} in progress
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            No open reports
          </span>
        )}

        {assessmentsDueCount > 0 ? (
          <button
            type="button"
            onClick={onAssessmentsChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-left text-sm font-medium text-sky-900 transition active:scale-[0.99] sm:min-h-11"
          >
            {assessmentsDueCount} due
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            Assessments clear
          </span>
        )}
      </div>
    </div>
  )
}
