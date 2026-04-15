import { describe, it, expect } from "vitest"
import {
  requireAuth,
  requireSuperAdmin,
  requireAdminTier,
  requirePhase2Access,
  requireFacility,
  requireRole,
  requireCanInviteStaff,
} from "@/lib/permissions"
import type { CurrentUser, WaikRole } from "@/lib/types"

function makeRole(overrides: Partial<WaikRole> = {}): WaikRole {
  return {
    id: "role-1",
    name: "Test",
    slug: "rn",
    permissions: [],
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    canViewIntelligence: true,
    facilityScoped: true,
    ...overrides,
  }
}

function makeUser(p: Partial<CurrentUser> = {}): CurrentUser {
  const role = p.role ? makeRole(p.role) : makeRole()
  return {
    clerkUserId: p.clerkUserId ?? "user_1",
    userId: p.userId ?? "64b000000000000000000001",
    facilityId: p.facilityId ?? "fac-1",
    organizationId: p.organizationId ?? "org-1",
    firstName: p.firstName ?? "A",
    lastName: p.lastName ?? "B",
    email: p.email ?? "a@b.c",
    roleSlug: p.roleSlug ?? role.slug,
    role,
    isWaikSuperAdmin: p.isWaikSuperAdmin ?? false,
    deviceType: p.deviceType ?? "personal",
    mustChangePassword: p.mustChangePassword ?? false,
    isAdminTier: p.isAdminTier ?? role.isAdminTier,
    canAccessPhase2: p.canAccessPhase2 ?? role.canAccessPhase2,
    canInviteStaff: p.canInviteStaff ?? role.canInviteStaff,
    canManageResidents: p.canManageResidents ?? role.canManageResidents,
  }
}

describe("task 00a permissions", () => {
  it("requireAuth throws when null", () => {
    expect(() => requireAuth(null)).toThrow("Unauthorized")
  })

  it("requireSuperAdmin throws when not super admin", () => {
    const u = makeUser({ isWaikSuperAdmin: false })
    expect(() => requireSuperAdmin(u)).toThrow("Forbidden")
  })

  it("requireFacility allows super admin across facilities", () => {
    const u = makeUser({ isWaikSuperAdmin: true, facilityId: "a" })
    expect(() => requireFacility(u, "b")).not.toThrow()
  })

  it("requireFacility throws when facility mismatch", () => {
    const u = makeUser({ isWaikSuperAdmin: false, facilityId: "a" })
    expect(() => requireFacility(u, "b")).toThrow("Forbidden")
  })

  it("requireRole allows matching slug", () => {
    const u = makeUser({ roleSlug: "cna", role: makeRole({ slug: "cna" }) })
    expect(() => requireRole(u, "cna", "rn")).not.toThrow()
  })

  it("requireRole throws when slug not listed", () => {
    const u = makeUser({ roleSlug: "cna", role: makeRole({ slug: "cna" }) })
    expect(() => requireRole(u, "owner")).toThrow("Forbidden")
  })

  it("requirePhase2Access uses user flag", () => {
    const u = makeUser({ canAccessPhase2: false })
    expect(() => requirePhase2Access(u)).toThrow("Forbidden")
    const u2 = makeUser({ canAccessPhase2: true })
    expect(() => requirePhase2Access(u2)).not.toThrow()
  })

  it("requireAdminTier respects isAdminTier", () => {
    const u = makeUser({ isAdminTier: false })
    expect(() => requireAdminTier(u)).toThrow("Forbidden")
    const u2 = makeUser({ isAdminTier: true })
    expect(() => requireAdminTier(u2)).not.toThrow()
  })

  it("requireCanInviteStaff respects flag", () => {
    const u = makeUser({ canInviteStaff: false })
    expect(() => requireCanInviteStaff(u)).toThrow("Forbidden")
    const u2 = makeUser({ canInviteStaff: true })
    expect(() => requireCanInviteStaff(u2)).not.toThrow()
  })
})
