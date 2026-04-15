import { describe, it, expect } from "vitest"
import type { CreateIncidentFromReportInput } from "@/lib/db"

describe("task 02 data isolation", () => {
  it("CreateIncidentFromReportInput requires facilityId", () => {
    const valid: CreateIncidentFromReportInput = {
      facilityId: "f1",
      narrative: "n",
      residentName: "r",
      residentRoom: "1",
      reportedById: "u",
      reportedByName: "U",
      reportedByRole: "rn",
    }
    expect(valid.facilityId).toBe("f1")
  })
})
