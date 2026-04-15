import { describe, it, expect } from "vitest"
import { generateTempPassword } from "@/lib/waik-admin-utils"

describe("waik-admin utils", () => {
  it("generateTempPassword matches WaiK- prefix and length", () => {
    const p = generateTempPassword()
    expect(p.startsWith("WaiK-")).toBe(true)
    expect(p.length).toBeGreaterThan(8)
  })
})
