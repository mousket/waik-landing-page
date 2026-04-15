import type { UserRole } from "@/lib/types"

/** Stored in Clerk `publicMetadata.role` and `UserModel.roleSlug` */
export type WaikRoleSlug = UserRole

/** Clerk `publicMetadata` shape for WAiK (set in Clerk Dashboard). */
export interface WaikPublicMetadata {
  facilityId?: string
  orgId?: string
  organizationId?: string
  role?: WaikRoleSlug
  roleSlug?: WaikRoleSlug
  facilityName?: string
  isWaikSuperAdmin?: boolean
  mustChangePassword?: boolean
}

export const WAIK_ADMIN_ROLES: readonly WaikRoleSlug[] = [
  "owner",
  "administrator",
  "director_of_nursing",
  "head_nurse",
] as const

export const WAIK_STAFF_ROLES: readonly WaikRoleSlug[] = [
  "rn",
  "lpn",
  "cna",
  "staff",
  "physical_therapist",
  "dietician",
] as const

export const WAIK_PHASE2_ROLES: readonly WaikRoleSlug[] = [
  "director_of_nursing",
  "administrator",
  "owner",
] as const

export function isAdminRole(role: string): boolean {
  return WAIK_ADMIN_ROLES.includes(role as WaikRoleSlug)
}

export function isStaffTierRole(role: string): boolean {
  return WAIK_STAFF_ROLES.includes(role as WaikRoleSlug)
}

/** Maps Clerk / Mongo role slug to `UserRole`. */
export function toUiRole(waikRole: string | undefined): UserRole | null {
  if (!waikRole) return null
  const all = [...WAIK_ADMIN_ROLES, ...WAIK_STAFF_ROLES] as readonly string[]
  if (all.includes(waikRole)) return waikRole as UserRole
  return "staff"
}

export function canAccessPhase2(role: string): boolean {
  return WAIK_PHASE2_ROLES.includes(role as WaikRoleSlug)
}
