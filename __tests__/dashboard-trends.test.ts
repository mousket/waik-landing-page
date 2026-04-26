import { describe, it, expect } from "vitest"
import { trendGlyph } from "@/lib/utils/dashboard-trends"

describe("trendGlyph", () => {
  it("returns null when prev is 0", () => {
    expect(trendGlyph(5, 0, true)).toBeNull()
  })

  it("returns neutral arrow when values equal", () => {
    expect(trendGlyph(10, 10, true)).toEqual({ symbol: "→", tone: "neutral" })
  })

  it("higherIsBetter: increase is good", () => {
    expect(trendGlyph(90, 80, true)).toEqual({ symbol: "↑", tone: "good" })
  })

  it("higherIsBetter: decrease is bad", () => {
    expect(trendGlyph(70, 80, true)).toEqual({ symbol: "↓", tone: "bad" })
  })

  it("lowerIsBetter (incidents): decrease is good", () => {
    expect(trendGlyph(8, 12, false)).toEqual({ symbol: "↓", tone: "good" })
  })

  it("lowerIsBetter: increase is bad", () => {
    expect(trendGlyph(12, 8, false)).toEqual({ symbol: "↑", tone: "bad" })
  })
})
