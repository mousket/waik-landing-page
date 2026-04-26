"use client"

import { useCallback, useMemo, useState } from "react"
import { X } from "lucide-react"
import type { DashboardStats } from "@/lib/types/dashboard-stats"

function todayKey() {
  return new Date().toISOString().split("T")[0] ?? ""
}

function dismissStorageKey() {
  return `waik-brief-dismissed-${todayKey()}`
}

export function DailyBrief({ stats, userDisplayName }: { stats: DashboardStats; userDisplayName: string }) {
  const dismissKey = useMemo(() => dismissStorageKey(), [])

  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true
    return !window.localStorage.getItem(dismissKey)
  })

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(dismissKey, "1")
    } catch {
      /* ignore quota / private mode */
    }
    setVisible(false)
  }, [dismissKey])

  if (!visible) return null

  const firstName = userDisplayName.trim().split(/\s+/)[0] || "there"

  return (
    <div className="relative rounded-xl border-l-4 border-l-primary bg-primary/5 p-4 pr-12 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-10 w-10 min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-muted-foreground hover:bg-background/80"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="font-medium text-primary">Good morning, {firstName}.</p>
      <p className="mt-2 text-sm text-foreground">
        {stats.totalIncidents30d} incident{stats.totalIncidents30d === 1 ? "" : "s"} in the last 30 days —{" "}
        {stats.avgCompleteness30d}% average completeness.
      </p>
    </div>
  )
}
