import type { CurrentUser } from "@/lib/types"

function httpError(status: number, message: string): Error {
  const e = new Error(message)
  ;(e as Error & { status: number }).status = status
  return e
}

export function requireAuth(user: CurrentUser | null): asserts user is CurrentUser {
  if (!user) {
    throw httpError(401, "Unauthorized")
  }
}

export function requireSuperAdmin(user: CurrentUser): void {
  if (!user.isWaikSuperAdmin) {
    throw httpError(403, "Forbidden")
  }
}

export function requireAdminTier(user: CurrentUser): void {
  if (!user.isAdminTier) {
    throw httpError(403, "Forbidden")
  }
}

export function requirePhase2Access(user: CurrentUser): void {
  if (!user.canAccessPhase2) {
    throw httpError(403, "Forbidden")
  }
}

export function requireFacility(user: CurrentUser, facilityId: string): void {
  if (user.isWaikSuperAdmin) return
  if (!facilityId || user.facilityId === facilityId) return
  throw httpError(403, "Forbidden")
}

export function requireRole(user: CurrentUser, ...slugs: string[]): void {
  if (!slugs.includes(user.roleSlug)) {
    throw httpError(403, "Forbidden")
  }
}

export function requireCanInviteStaff(user: CurrentUser): void {
  if (!user.canInviteStaff) {
    throw httpError(403, "Forbidden")
  }
}
