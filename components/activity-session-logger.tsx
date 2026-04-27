"use client"

import { useEffect, useRef } from "react"

/**
 * Fires a deduplicated `login` activity for the current session (see POST /api/activity/session).
 */
export function ActivitySessionLogger() {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    void fetch("/api/activity/session", { method: "POST" }).catch(() => {
      /* non-blocking */
    })
  }, [])
  return null
}
