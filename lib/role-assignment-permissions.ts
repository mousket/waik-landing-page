import type { UserRole } from "@/lib/types"
import { isAdminRole } from "@/lib/waik-roles"

const DON_ASSIGNABLE: readonly UserRole[] = [
  "rn",
  "lpn",
  "cna",
  "staff",
  "physical_therapist",
  "dietician",
] as const

/**
 * Server-side: whether `inviterRole` may set another user's role to `targetRole`
 * (invites and role changes). Mirrors phase 5 staff-management matrix.
 */
export function isRoleAssignableByInviter(
  inviterRoleSlug: string,
  targetRoleSlug: string,
): boolean {
  if (inviterRoleSlug === "owner") {
    return true
  }
  if (inviterRoleSlug === "administrator") {
    return targetRoleSlug !== "owner"
  }
  if (inviterRoleSlug === "director_of_nursing") {
    return (DON_ASSIGNABLE as readonly string[]).includes(targetRoleSlug)
  }
  return false
}

export function filterRolesAssignableByInviter<T extends { slug: string }>(
  inviterRoleSlug: string,
  allRoles: T[],
): T[] {
  return allRoles.filter((r) => isRoleAssignableByInviter(inviterRoleSlug, r.slug))
}

export function isAdminTierRole(slug: string): boolean {
  return isAdminRole(slug) || slug === "head_nurse"
}

export function isClinicalStaffRole(slug: string): boolean {
  return !isAdminTierRole(slug)
}
