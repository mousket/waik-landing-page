import { describe, expect, it } from "vitest"
import { incidentPatternFromRows } from "@/lib/resident-incident-pattern"

describe("incidentPatternFromRows", () => {
  it("returns alert when 3+ in 30d", () => {
    const now = new Date("2026-06-15T12:00:00Z")
    const r = [
      { id: "1", incidentType: "fall", startedAt: "2026-06-10T10:00:00.000Z" },
      { id: "2", incidentType: "fall", startedAt: "2026-06-05T10:00:00.000Z" },
      { id: "3", incidentType: "med", startedAt: "2026-06-01T10:00:00.000Z" },
    ]
    const p = incidentPatternFromRows(r, now)
    expect(p.count30).toBe(3)
    expect(p.alertRepeat30).toBe(true)
    expect(p.byType30.fall).toBe(2)
  })

  it("excludes older than 30d from count30", () => {
    const now = new Date("2026-06-15T12:00:00Z")
    const r = [
      { id: "1", incidentType: "fall", startedAt: "2025-01-01T10:00:00.000Z" },
    ]
    const p = incidentPatternFromRows(r, now)
    expect(p.count30).toBe(0)
    expect(p.count180).toBe(0)
  })
})
