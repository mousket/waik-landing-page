"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import type { UserRole } from "@/lib/types"
import type { WaikPublicMetadata } from "@/lib/waik-roles"
import { toUiRole } from "@/lib/waik-roles"

/**
 * Clerk session mapped to legacy `UserRole` for existing UI (`"admin"` | `"staff"`).
 */
export function useWaikUser() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Partial<WaikPublicMetadata>
  const waikRole = meta.role
  const role: UserRole | null = meta.isWaikSuperAdmin ? "admin" : toUiRole(waikRole)
  const metaFlag = meta.mustChangePassword === true
  const [apiMustChange, setApiMustChange] = useState(false)
  useEffect(() => {
    if (!isLoaded) return
    // Mongo-backed mustChangePassword; Clerk metadata is optional
    const ac = new AbortController()
    ;(async () => {
      try {
        const r = await fetch("/api/auth/user-flags", { method: "GET", signal: ac.signal })
        if (r.ok) {
          const j = (await r.json()) as { mustChangePassword?: boolean }
          setApiMustChange(Boolean(j.mustChangePassword))
        } else {
          setApiMustChange(false)
        }
      } catch {
        if (!ac.signal.aborted) setApiMustChange(false)
      }
    })()
    return () => ac.abort()
  }, [isLoaded, user?.id])
  const mustChangePassword = metaFlag || apiMustChange

  return {
    isLoaded,
    isSignedIn: Boolean(user),
    userId: user?.id ?? null,
    name:
      user?.fullName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress ||
      null,
    username: user?.username ?? null,
    waikRole: waikRole ?? null,
    role,
    isWaikSuperAdmin: Boolean(meta.isWaikSuperAdmin),
    mustChangePassword,
  }
}
