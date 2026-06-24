import { describe, expect, it } from "vitest"
import {
  canUseStaffOperationalSurface,
  userCanReportIncidents,
  userCanUseStaffOperationalSurface,
} from "@/lib/waik-roles"

describe("staff operational surface access", () => {
  it("allows admin and head staff roles", () => {
    expect(canUseStaffOperationalSurface("administrator")).toBe(true)
    expect(canUseStaffOperationalSurface("head_nurse")).toBe(true)
    expect(canUseStaffOperationalSurface("director_of_nursing")).toBe(true)
    expect(canUseStaffOperationalSurface("owner")).toBe(true)
  })

  it("allows clinical staff roles", () => {
    expect(canUseStaffOperationalSurface("rn")).toBe(true)
    expect(canUseStaffOperationalSurface("cna")).toBe(true)
  })

  it("blocks platform super admin without a facility", () => {
    expect(
      userCanUseStaffOperationalSurface({
        roleSlug: "administrator",
        isWaikSuperAdmin: true,
        facilityId: "",
      }),
    ).toBe(false)
  })

  it("allows platform super admin when scoped to a facility", () => {
    expect(
      userCanUseStaffOperationalSurface({
        roleSlug: "administrator",
        isWaikSuperAdmin: true,
        facilityId: "fac-sunrise",
      }),
    ).toBe(true)
  })

  it("allows super admin to report when acting in a scoped facility", () => {
    expect(
      userCanReportIncidents(
        { roleSlug: "administrator", isWaikSuperAdmin: true, facilityId: "" },
        "fac-sunrise",
      ),
    ).toBe(true)
  })

  it("blocks super admin report without scoped facility", () => {
    expect(
      userCanReportIncidents({ roleSlug: "administrator", isWaikSuperAdmin: true, facilityId: "" }),
    ).toBe(false)
  })
})
