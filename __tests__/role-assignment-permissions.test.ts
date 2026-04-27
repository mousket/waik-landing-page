import { describe, it, expect } from "vitest"
import { isRoleAssignableByInviter } from "@/lib/role-assignment-permissions"

describe("isRoleAssignableByInviter (phase 5 matrix)", () => {
  it("owner can assign any role", () => {
    expect(isRoleAssignableByInviter("owner", "owner")).toBe(true)
    expect(isRoleAssignableByInviter("owner", "administrator")).toBe(true)
    expect(isRoleAssignableByInviter("owner", "cna")).toBe(true)
  })

  it("administrator cannot assign owner", () => {
    expect(isRoleAssignableByInviter("administrator", "owner")).toBe(false)
    expect(isRoleAssignableByInviter("administrator", "director_of_nursing")).toBe(true)
  })

  it("DON can only assign clinical / therapy roles", () => {
    expect(isRoleAssignableByInviter("director_of_nursing", "rn")).toBe(true)
    expect(isRoleAssignableByInviter("director_of_nursing", "cna")).toBe(true)
    expect(isRoleAssignableByInviter("director_of_nursing", "administrator")).toBe(false)
    expect(isRoleAssignableByInviter("director_of_nursing", "head_nurse")).toBe(false)
  })
})
