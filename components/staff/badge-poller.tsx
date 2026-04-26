"use client"

import * as React from "react"
import { useBadges } from "@/components/staff/badge-context"

export function BadgePoller() {
  const { setBadges } = useBadges()

  React.useEffect(() => {
    let alive = true

    async function fetchBadges() {
      try {
        const res = await fetch("/api/staff/badge-counts")
        if (!res.ok) return
        const data = (await res.json()) as { pendingQuestions?: number; dueAssessments?: number }
        if (!alive) return
        setBadges({
          pendingQuestions: Number(data.pendingQuestions ?? 0),
          dueAssessments: Number(data.dueAssessments ?? 0),
        })
      } catch {
        // Ignore polling failures (offline / transient); UI should remain usable.
      }
    }

    fetchBadges()
    const interval = window.setInterval(fetchBadges, 60_000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [setBadges])

  return null
}

