import { describe, it, expect } from "vitest"
import { computeDaysToClose, generateClosedIncidentsCsv } from "@/lib/utils/csv-export"
import type { IncidentSummary } from "@/lib/types/incident-summary"

const minimalClosed = (over: Partial<IncidentSummary>): IncidentSummary => ({
  id: "inc-009",
  facilityId: "fac-1",
  residentRoom: "515",
  incidentType: "fall",
  hasInjury: false,
  phase: "closed",
  staffId: "u1",
  reportedByName: "Maria Torres",
  reportedByRole: "rn",
  startedAt: "2025-01-01T00:00:00.000Z",
  phase1SignedAt: "2025-01-01T00:00:00.000Z",
  phase2ClaimedAt: null,
  phase2LockedAt: "2025-01-04T12:00:00.000Z",
  completenessAtSignoff: 93,
  completenessScore: 93,
  investigatorId: "don-1",
  investigatorName: "Dr. Sarah Kim",
  idtTeam: [],
  phase2Sections: {
    contributingFactors: { status: "complete" },
    rootCause: { status: "complete" },
    interventionReview: { status: "complete" },
    newIntervention: { status: "complete" },
  },
  ...over,
})

describe("computeDaysToClose", () => {
  it("returns ceil of day difference (INC-009 style: 3 days)", () => {
    const p1 = new Date("2025-04-07T10:00:00.000Z")
    const p2 = new Date("2025-04-10T10:00:00.000Z")
    expect(
      computeDaysToClose({
        phase1SignedAt: p1.toISOString(),
        phase2LockedAt: p2.toISOString(),
      }),
    ).toBe(3)
  })

  it("returns null when a timestamp is missing", () => {
    expect(computeDaysToClose({ phase1SignedAt: null, phase2LockedAt: "2025-01-01T00:00:00.000Z" })).toBeNull()
  })
})

describe("generateClosedIncidentsCsv", () => {
  it("includes header row and quoted cells; no resident name column", () => {
    const inc = minimalClosed({
      phase1SignedAt: "2025-04-07T10:00:00.000Z",
      phase2LockedAt: "2025-04-10T10:00:00.000Z",
    })
    const csv = generateClosedIncidentsCsv([inc])
    const lines = csv.split("\n")
    expect(lines[0]).toBe(
      "roomNumber,incidentType,completenessAtSignoff,phase1SignedAt,phase2LockedAt,investigatorName,daysToClose",
    )
    expect(csv).toContain('"515"')
    expect(csv).toContain('"fall"')
    expect(csv).toContain('"93"')
    expect(csv).toContain('"Dr. Sarah Kim"')
    expect(csv).not.toContain("Thompson")
    expect(csv).toContain('"3"')
  })

  it("escapes double quotes in cell values", () => {
    const inc = minimalClosed({ investigatorName: 'Dr. "SK" Kim' })
    const csv = generateClosedIncidentsCsv([inc])
    expect(csv).toContain('""SK""')
  })
})
