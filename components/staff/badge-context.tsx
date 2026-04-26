"use client"

import * as React from "react"

export interface BadgeCounts {
  pendingQuestions: number
  dueAssessments: number
}

type BadgeContextValue = BadgeCounts & {
  setBadges: (counts: BadgeCounts) => void
}

const BadgeContext = React.createContext<BadgeContextValue | null>(null)

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadgesState] = React.useState<BadgeCounts>({
    pendingQuestions: 0,
    dueAssessments: 0,
  })

  const setBadges = React.useCallback((counts: BadgeCounts) => {
    setBadgesState({
      pendingQuestions: Number(counts?.pendingQuestions ?? 0),
      dueAssessments: Number(counts?.dueAssessments ?? 0),
    })
  }, [])

  const value = React.useMemo(() => ({ ...badges, setBadges }), [badges, setBadges])

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
}

export function useBadges(): BadgeContextValue {
  const ctx = React.useContext(BadgeContext)
  if (!ctx) {
    throw new Error("useBadges must be used within BadgeProvider")
  }
  return ctx
}

