"use client"

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
  const mustChangePassword = meta.mustChangePassword === true

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
