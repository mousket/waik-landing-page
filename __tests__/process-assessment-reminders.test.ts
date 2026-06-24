import { describe, expect, it } from "vitest"

import { displayAssessmentType } from "@/lib/assessments/presentation"

describe("processAssessmentDueReminders helpers", () => {
  it("formats assessment type labels for reminder copy", () => {
    expect(displayAssessmentType("activity")).toBe("Activity")
    expect(displayAssessmentType("dietary")).toBe("Dietary")
  })
})
