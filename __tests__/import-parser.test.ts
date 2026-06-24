import { describe, expect, it } from "vitest"
import { parseCsvText } from "@/lib/import-parser"
import { validateStaffImportRows } from "@/lib/import/staff-rows"
import { validateResidentImportRows } from "@/lib/import/resident-rows"

describe("parseCsvText", () => {
  it("parses headers and normalizes keys", () => {
    const { headers, rows } = parseCsvText("first_name,last_name\nJane,Doe\n")
    expect(headers).toEqual(["first_name", "last_name"])
    expect(rows[0]).toEqual({ first_name: "Jane", last_name: "Doe" })
  })
})

describe("validateStaffImportRows", () => {
  it("marks valid row when role and email ok", () => {
    const rows = validateStaffImportRows(
      [{ first_name: "Jane", last_name: "Doe", email: "j@x.com", role_slug: "rn" }],
      { roleSlugs: new Set(["rn"]), existingEmails: new Set() },
    )
    expect(rows[0]?.status).toBe("valid")
  })
})

describe("validateResidentImportRows", () => {
  it("requires care_level", () => {
    const rows = validateResidentImportRows(
      [{ first_name: "A", last_name: "B", room_number: "1", care_level: "bad" }],
      { existingKeys: new Set(), roomNamePairs: new Set() },
    )
    expect(rows[0]?.status_row).toBe("error")
  })
})
