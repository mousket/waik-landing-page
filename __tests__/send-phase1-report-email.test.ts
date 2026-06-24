// @vitest-environment node
import { describe, expect, it } from "vitest"

import { isValidEmailAddress } from "@/lib/send-phase1-report-email"

describe("isValidEmailAddress", () => {
  it("accepts standard addresses", () => {
    expect(isValidEmailAddress("nurse@facility.org")).toBe(true)
    expect(isValidEmailAddress("  don@example.com  ")).toBe(true)
  })

  it("rejects invalid addresses", () => {
    expect(isValidEmailAddress("")).toBe(false)
    expect(isValidEmailAddress("not-an-email")).toBe(false)
    expect(isValidEmailAddress("@missing.local")).toBe(false)
  })
})
