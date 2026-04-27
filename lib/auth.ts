import { auth as clerkAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import type { CurrentUser, WaikRole } from "@/lib/types"
import { canAccessPhase2, isAdminRole, type WaikRoleSlug } from "@/lib/waik-roles"

export type { WaikPublicMetadata, WaikRoleSlug } from "@/lib/waik-roles"
export type { CurrentUser, WaikRole } from "@/lib/types"
export { isAdminRole, isStaffTierRole, canAccessPhase2 } from "@/lib/waik-roles"

/** @deprecated Prefer `CurrentUser` */
export type WaikCurrentUser = CurrentUser

/** When `RoleModel` has no document for `roleSlug`, infer tier from slug for routing (unknown → staff). */
function fallbackRoleFromSlug(slug: string): WaikRole {
  return {
    id: "",
    name: slug,
    slug,
    permissions: [],
    isAdminTier: isAdminRole(slug),
    canAccessPhase2: canAccessPhase2(slug),
    canInviteStaff: false,
    canManageResidents: false,
    canViewIntelligence: true,
    facilityScoped: true,
  }
}

function mapRoleDoc(d: Record<string, unknown>): WaikRole {
  return {
    id: String(d.id ?? ""),
    name: String(d.name ?? ""),
    slug: String(d.slug ?? ""),
    permissions: Array.isArray(d.permissions) ? (d.permissions as string[]) : [],
    isAdminTier: Boolean(d.isAdminTier),
    canAccessPhase2: Boolean(d.canAccessPhase2),
    canInviteStaff: Boolean(d.canInviteStaff),
    canManageResidents: Boolean(d.canManageResidents),
    canViewIntelligence: d.canViewIntelligence !== false,
    facilityScoped: d.facilityScoped !== false,
  }
}

/**
 * Returns the signed-in WAiK user from Clerk + MongoDB (UserModel + RoleModel), or null.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await clerkAuth()
  const clerkSessionId = session.userId
  if (!clerkSessionId) return null

  await connectMongo()

  const mongoUser = await UserModel.findOne({ clerkUserId: clerkSessionId }).lean().exec()
  if (!mongoUser || Array.isArray(mongoUser)) {
    console.warn("Clerk user exists but no MongoDB record found:", clerkSessionId)
    return null
  }

  const roleDoc = await RoleModel.findOne({ slug: mongoUser.roleSlug }).lean().exec()
  const role =
    !roleDoc || Array.isArray(roleDoc)
      ? fallbackRoleFromSlug(String(mongoUser.roleSlug ?? ""))
      : mapRoleDoc(roleDoc as Record<string, unknown>)

  const firstName = mongoUser.firstName ?? ""
  const lastName = mongoUser.lastName ?? ""

  // Prefer business `id` (matches `Incident.staffId` in seed and most WAiK joins); fall back to ObjectId.
  const idRaw = (mongoUser as { _id?: unknown })._id
  const businessId = typeof mongoUser.id === "string" && mongoUser.id.trim() ? mongoUser.id.trim() : ""
  const userId = businessId || (idRaw != null ? String(idRaw) : String(mongoUser.id ?? ""))

  return {
    clerkUserId: clerkSessionId,
    userId,
    facilityId: mongoUser.facilityId ?? "",
    organizationId: mongoUser.organizationId ?? "",
    firstName,
    lastName,
    email: mongoUser.email,
    roleSlug: mongoUser.roleSlug,
    role,
    isWaikSuperAdmin: Boolean(mongoUser.isWaikSuperAdmin),
    deviceType: mongoUser.deviceType ?? "personal",
    mustChangePassword: Boolean(mongoUser.mustChangePassword),
    selectedUnit: mongoUser.selectedUnit ?? undefined,
    selectedUnitDate: mongoUser.selectedUnitDate ?? undefined,
    isAdminTier: role.isAdminTier,
    canAccessPhase2: role.canAccessPhase2,
    canInviteStaff: role.canInviteStaff,
    canManageResidents: role.canManageResidents,
  }
}

/**
 * Ensures the user is in the same facility, unless WAiK super-admin.
 */
export function requireFacilityAccess(user: CurrentUser, facilityId: string): void {
  if (user.isWaikSuperAdmin) return
  if (!facilityId || user.facilityId === facilityId) return
  const err = new Error("Forbidden")
  ;(err as Error & { status: number }).status = 403
  throw err
}

/**
 * Throws if role not allowed (401 unauthenticated, 403 wrong role).
 */
export async function requireRole(allowedRoles: WaikRoleSlug[]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    const e = new Error("Unauthorized")
    ;(e as Error & { status: number }).status = 401
    throw e
  }
  if (!allowedRoles.includes(user.roleSlug as WaikRoleSlug)) {
    const e = new Error("Forbidden")
    ;(e as Error & { status: number }).status = 403
    throw e
  }
  return user
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export function authErrorResponse(err: unknown) {
  const status =
    err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500
  const message = err instanceof Error ? err.message : "Internal Server Error"
  if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json({ error: message }, { status })
}
