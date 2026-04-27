"use client"

import { useEffect, useState } from "react"

function firstNameOnly(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

/** Local time: morning 4:00–11:59, afternoon 12:00–17:59, evening 18:00–3:59. */
function salutationFromHour(h: number): string {
  if (h >= 4 && h < 12) return "Good morning"
  if (h >= 12 && h < 18) return "Good afternoon"
  return "Good evening"
}

const CHIP =
  "inline-flex min-h-9 max-w-full items-center rounded-full border px-2.5 py-1.5 text-xs font-semibold tabular-nums sm:min-h-10 sm:text-sm"

/**
 * Top-of-page hero for staff home — same gradient card language as
 * {@link AdminDashboardGreeting}, with shift chips instead of a facility switcher.
 */
export function StaffDashboardGreeting({
  firstName,
  selectedUnit,
  pendingCount,
  inProgressCount,
  assessmentsDueCount,
  onPendingClick,
  onInProgressClick,
  onAssessmentsClick,
}: {
  firstName: string
  selectedUnit: string | null
  pendingCount: number
  inProgressCount: number
  assessmentsDueCount: number
  onPendingClick: () => void
  onInProgressClick: () => void
  onAssessmentsClick: () => void
}) {
  const first = firstNameOnly(firstName)
  const [greet, setGreet] = useState("Hello")

  useEffect(() => {
    setGreet(salutationFromHour(new Date().getHours()))
  }, [])

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-background to-accent/[0.08] p-5 shadow-md sm:p-6 md:p-7">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 left-1/3 h-24 w-40 rounded-full bg-accent/10 blur-2xl"
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Today on the floor</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
        {greet}, {first}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {
          "Prioritize your open reports, finish outstanding questions, and file new incidents as they happen. Your work stays linked to the residents you care for."
        }
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {selectedUnit ? (
          <span
            className={`${CHIP} border-primary/30 bg-primary/5 text-foreground`}
            title={selectedUnit}
          >
            {selectedUnit}
          </span>
        ) : null}
        {pendingCount > 0 ? (
          <button
            type="button"
            onClick={onPendingClick}
            className={`${CHIP} border-red-200/90 bg-red-100/90 text-red-900 transition hover:brightness-95 active:scale-[0.99]`}
          >
            {pendingCount} to answer
          </button>
        ) : null}
        {inProgressCount > 0 ? (
          <button
            type="button"
            onClick={onInProgressClick}
            className={`${CHIP} border-amber-200/90 bg-amber-100/90 text-amber-950 transition hover:brightness-95 active:scale-[0.99]`}
          >
            {inProgressCount} open
          </button>
        ) : null}
        {assessmentsDueCount > 0 ? (
          <button
            type="button"
            onClick={onAssessmentsClick}
            className={`${CHIP} border-emerald-200/80 bg-emerald-100/80 text-emerald-950 transition hover:brightness-95 active:scale-[0.99]`}
          >
            {assessmentsDueCount} assessment{assessmentsDueCount === 1 ? "" : "s"} due
          </button>
        ) : null}
        {pendingCount + inProgressCount + assessmentsDueCount === 0 ? (
          <span
            className={`${CHIP} border-emerald-200/80 bg-emerald-100/80 text-emerald-900`}
            aria-hidden
          >
            All clear for now
          </span>
        ) : null}
      </div>
    </div>
  )
}
