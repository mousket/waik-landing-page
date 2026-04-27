"use client"

import { useUser } from "@clerk/nextjs"
import type { UserRole } from "@/lib/types"
import { toUiRole } from "@/lib/waik-roles"

export interface RoleGateProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Renders `children` only when the signed-in user’s role is in `allowedRoles`.
 * Uses Clerk `publicMetadata.role` / `roleSlug` (same as server-side UserModel).
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { user, isLoaded } = useUser()
  if (!isLoaded) {
    return null
  }
  const meta = (user?.publicMetadata ?? {}) as { role?: string; roleSlug?: string }
  const raw = meta.roleSlug ?? meta.role
  const role = toUiRole(typeof raw === "string" ? raw : undefined)
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
