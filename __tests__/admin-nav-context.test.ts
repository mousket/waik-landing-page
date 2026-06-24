// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  adminIncidentsNavHref,
  buildAdminPathWithContext,
  isAdminIncidentsNavActive,
} from "@/lib/admin-nav-context"

describe("buildAdminPathWithContext", () => {
  it("appends facility and org from URL only", () => {
    const sp = new URLSearchParams("facilityId=fac-1&organizationId=org-1")
    expect(buildAdminPathWithContext("/admin/dashboard", sp)).toBe(
      "/admin/dashboard?facilityId=fac-1&organizationId=org-1",
    )
  })

  it("returns bare path when URL has no scope params", () => {
    expect(buildAdminPathWithContext("/admin/dashboard", new URLSearchParams())).toBe("/admin/dashboard")
  })
})

describe("adminIncidentsNavHref", () => {
  it("always points to the admin facility list", () => {
    expect(adminIncidentsNavHref()).toBe("/admin/incidents")
  })

  it("highlights admin incident routes only", () => {
    expect(isAdminIncidentsNavActive("/admin/incidents")).toBe(true)
    expect(isAdminIncidentsNavActive("/admin/incidents/inc-001")).toBe(true)
    expect(isAdminIncidentsNavActive("/staff/incidents")).toBe(false)
    expect(isAdminIncidentsNavActive("/staff/incidents/inc-001")).toBe(false)
  })
})
