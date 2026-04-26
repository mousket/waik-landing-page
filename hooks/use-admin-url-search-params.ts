"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  readAdminScopeFromSession,
  writeAdminScopeToSession,
} from "@/lib/admin-session-scope"

export type { AdminPersistedScope } from "@/lib/admin-session-scope"
export { readAdminScopeFromSession, writeAdminScopeToSession } from "@/lib/admin-session-scope"

/**
 * In `/admin` routes, read the real browser address bar for query params. Next.js
 * `useSearchParams` can be empty for a frame or not match the bar during client navigation,
 * which would make `buildAdminPathWithContext` emit links *without* `facilityId`/`organizationId`.
 */
export function useAdminUrlSearchParams(): URLSearchParams {
  const fromNext = useSearchParams()
  const pathname = usePathname()
  const fromNextStr = fromNext.toString()
  const [bar, setBar] = useState(() => {
    if (typeof window === "undefined" || !window.location.pathname.startsWith("/admin")) {
      return ""
    }
    return window.location.search.slice(1)
  })
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !pathname.startsWith("/admin")) {
      setBar("")
      return
    }
    setBar(window.location.search.slice(1))
  }, [pathname, fromNextStr])
  return useMemo(() => {
    if (pathname.startsWith("/admin")) {
      return new URLSearchParams(bar)
    }
    return new URLSearchParams(fromNextStr)
  }, [bar, fromNextStr, pathname])
}

/**
 * Persists a valid `facilityId`+`organizationId` to sessionStorage, and re-adds them to the
 * current URL with `replace` if the user landed on a bare admin path (broken link from stale
 * search params) but we have a known scope in session.
 */
export function useAdminScopeUrlSync(): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchStr = searchParams.toString()

  const restoreAttempted = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname.startsWith("/admin")) {
      return
    }
    if (typeof window === "undefined") {
      return
    }

    const fromBar = new URLSearchParams(window.location.search)
    const facUrl = (fromBar.get("facilityId") || "").trim()
    const orgUrl = (fromBar.get("organizationId") || "").trim()

    if (facUrl && orgUrl) {
      writeAdminScopeToSession({ facilityId: facUrl, organizationId: orgUrl })
      restoreAttempted.current = null
      return
    }
    if (facUrl) {
      const prev = readAdminScopeFromSession()
      writeAdminScopeToSession({
        facilityId: facUrl,
        organizationId: orgUrl || prev?.organizationId || "",
      })
      restoreAttempted.current = null
      return
    }

    const saved = readAdminScopeFromSession()
    if (!saved?.facilityId) {
      return
    }
    if (fromBar.get("facilityId") || fromBar.get("organizationId")) {
      return
    }

    const key = `${pathname}|${saved.facilityId}|${saved.organizationId}`
    if (restoreAttempted.current === key) {
      return
    }
    restoreAttempted.current = key

    const next = new URLSearchParams()
    if (saved.facilityId) next.set("facilityId", saved.facilityId)
    if (saved.organizationId) next.set("organizationId", saved.organizationId)
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [pathname, router, searchStr])
}
