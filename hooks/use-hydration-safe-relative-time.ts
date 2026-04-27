"use client"

import { formatDistanceToNow } from "date-fns"
import { useEffect, useState } from "react"

/**
 * `formatDistanceToNow` at SSR vs hydration can differ by a few seconds and trips React
 * hydration. Return a stable placeholder until after mount, then the live value.
 */
export function useHydrationSafeRelativeTime(iso: string) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) {
      setLabel("—")
      return
    }
    const update = () => {
      setLabel(formatDistanceToNow(d, { addSuffix: true }))
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [iso])

  if (label === null) {
    return "—"
  }
  return label
}
