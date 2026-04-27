"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import type { DashboardStats } from "@/lib/types/dashboard-stats"

function todayKey() {
  return new Date().toISOString().split("T")[0] ?? ""
}

function dismissStorageKey() {
  return `waik-brief-dismissed-${todayKey()}`
}

function firstNameFromDisplay(userDisplayName: string) {
  return userDisplayName.trim().split(/\s+/)[0] || "there"
}

/** Local time: morning 4:00–11:59, afternoon 12:00–17:59, evening 18:00–3:59. */
function salutationFromHour(h: number): string {
  if (h >= 4 && h < 12) return "Good morning"
  if (h >= 12 && h < 18) return "Good afternoon"
  return "Good evening"
}

/** Prominent welcome line — always shown at the top of the dashboard. */
export function AdminDashboardGreeting({
  userDisplayName,
  scopeHealthLine,
}: {
  userDisplayName: string
  scopeHealthLine?: string | null
}) {
  const first = firstNameFromDisplay(userDisplayName)
  // Same on server and first client paint; salutation() uses local time only after mount (avoids hydration mismatch).
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
      <div className="pointer-events-none absolute -bottom-6 left-1/3 h-24 w-40 rounded-full bg-accent/10 blur-2xl" aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Command center</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
        {greet}, {first}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {"Here's what needs your attention at this facility today."}
      </p>
      {scopeHealthLine ? (
        <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-foreground/90">{scopeHealthLine}</p>
      ) : null}
    </div>
  )
}

export function DailyBrief({ stats, userDisplayName }: { stats: DashboardStats; userDisplayName: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const key = dismissStorageKey()
    try {
      if (window.localStorage.getItem(key)) {
        setVisible(false)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const dismiss = useCallback(() => {
    const key = dismissStorageKey()
    try {
      window.localStorage.setItem(key, "1")
    } catch {
      /* ignore quota / private mode */
    }
    setVisible(false)
  }, [])

  if (!visible) return null

  const first = firstNameFromDisplay(userDisplayName)

  return (
    <div className="relative rounded-xl border border-border/80 bg-card/80 p-4 pr-12 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-10 w-10 min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/80"
        aria-label="Dismiss stats summary"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{first}</span>, in the last 30 days this community has recorded{" "}
        <span className="font-semibold tabular-nums text-foreground">{stats.totalIncidents30d}</span> incident
        {stats.totalIncidents30d === 1 ? "" : "s"} with{" "}
        <span className="font-semibold tabular-nums text-primary">{stats.avgCompleteness30d}%</span> average report
        completeness.
      </p>
    </div>
  )
}
