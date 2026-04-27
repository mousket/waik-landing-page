import { describe, it, expect } from "vitest"
import { classifyIncident, computeClock, isIdtOverdue } from "@/lib/utils/incident-classification"
import type { IdtTeamMember, IncidentSummary } from "@/lib/types/incident-summary"

const base = (): IncidentSummary => ({
  id: "inc-1",
  facilityId: "fac-1",
  residentName: "Resident",
  residentRoom: "101",
  incidentType: "fall",
  hasInjury: false,
  phase: "phase_1_in_progress",
  staffId: "u1",
  reportedByName: "Nurse",
  reportedByRole: "rn",
  startedAt: new Date().toISOString(),
  phase1SignedAt: null,
  phase2ClaimedAt: null,
  phase2LockedAt: null,
  completenessAtSignoff: 0,
  completenessScore: 50,
  investigatorId: null,
  investigatorName: null,
  idtTeam: [],
  phase2Sections: {
    contributingFactors: { status: "not_started" },
    rootCause: { status: "not_started" },
    interventionReview: { status: "not_started" },
    newIntervention: { status: "not_started" },
  },
})

function summary(p: Partial<IncidentSummary>): IncidentSummary {
  return { ...base(), ...p }
}

describe("classifyIncident", () => {
  it("injury flag returns red_alert", () => {
    const now = Date.now()
    expect(
      classifyIncident(
        summary({
          hasInjury: true,
          phase: "phase_1_complete",
          startedAt: new Date(now).toISOString(),
        }),
        now,
      ),
    ).toBe("red_alert")
  })

  it("5hr open phase_1_in_progress returns red_alert", () => {
    const now = Date.now()
    const started = new Date(now - 5 * 60 * 60 * 1000).toISOString()
    expect(classifyIncident(summary({ hasInjury: false, phase: "phase_1_in_progress", startedAt: started }), now)).toBe(
      "red_alert",
    )
  })

  it("3hr open phase_1_in_progress returns none", () => {
    const now = Date.now()
    const started = new Date(now - 3 * 60 * 60 * 1000).toISOString()
    expect(classifyIncident(summary({ hasInjury: false, phase: "phase_1_in_progress", startedAt: started }), now)).toBe(
      "none",
    )
  })

  it("phase_1_complete no injury returns yellow_awaiting", () => {
    const now = Date.now()
    const started = new Date(now - 3 * 60 * 60 * 1000).toISOString()
    expect(classifyIncident(summary({ hasInjury: false, phase: "phase_1_complete", startedAt: started }), now)).toBe(
      "yellow_awaiting",
    )
  })

  it("phase_2_in_progress returns none", () => {
    expect(
      classifyIncident(
        summary({
          phase: "phase_2_in_progress",
          hasInjury: false,
          startedAt: new Date().toISOString(),
        }),
      ),
    ).toBe("none")
  })

  it("closed returns none", () => {
    expect(
      classifyIncident(
        summary({
          phase: "closed",
          hasInjury: false,
          startedAt: new Date().toISOString(),
        }),
      ),
    ).toBe("none")
  })
})

describe("isIdtOverdue", () => {
  const member = (p: Partial<IdtTeamMember>): IdtTeamMember => ({
    userId: "u1",
    name: "PT",
    role: "therapy",
    status: "pending",
    questionSent: "Q?",
    questionSentAt: null,
    response: null,
    respondedAt: null,
    ...p,
  })

  it("answered member → false", () => {
    expect(isIdtOverdue(member({ status: "answered", questionSentAt: new Date(0).toISOString() }))).toBe(false)
  })

  it("pending, 25hr elapsed → true", () => {
    const now = Date.now()
    const sent = new Date(now - 25 * 60 * 60 * 1000).toISOString()
    expect(isIdtOverdue(member({ questionSentAt: sent }), now)).toBe(true)
  })

  it("pending, 30hr elapsed → true (task-06f overdue IDT)", () => {
    const now = Date.now()
    const sent = new Date(now - 30 * 60 * 60 * 1000).toISOString()
    expect(isIdtOverdue(member({ questionSentAt: sent }), now)).toBe(true)
  })

  it("pending, 20hr elapsed → false", () => {
    const now = Date.now()
    const sent = new Date(now - 20 * 60 * 60 * 1000).toISOString()
    expect(isIdtOverdue(member({ questionSentAt: sent }), now)).toBe(false)
  })
})

describe("computeClock", () => {
  it("20hr elapsed → gray, ~28h remaining (>24h window)", () => {
    const now = Date.now()
    const signed = new Date(now - 20 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c).not.toBeNull()
    expect(c!.status).toBe("gray")
    expect(c!.label).toBe("28h remaining")
    expect(c!.hoursRemaining).toBeGreaterThan(27)
    expect(c!.hoursRemaining).toBeLessThan(29)
  })

  it("26hr elapsed → amber (~22h remaining, between 6 and 24)", () => {
    const now = Date.now()
    const signed = new Date(now - 26 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c!.status).toBe("amber")
    expect(c!.label).toBe("22h remaining")
  })

  it("43hr elapsed → red, ~5h remaining", () => {
    const now = Date.now()
    const signed = new Date(now - 43 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c!.status).toBe("red")
    expect(c!.label).toBe("5h remaining")
  })

  it("4hr elapsed → gray, ~44h remaining", () => {
    const now = Date.now()
    const signed = new Date(now - 4 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c!.status).toBe("gray")
    expect(c!.label).toBe("44h remaining")
  })

  it("50hr elapsed → overdue, Overdue by 2h", () => {
    const now = Date.now()
    const signed = new Date(now - 50 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c!.status).toBe("overdue")
    expect(c!.label).toBe("Overdue by 2h")
  })

  it("100hr elapsed → overdue, Overdue by 2d 4h", () => {
    const now = Date.now()
    const signed = new Date(now - 100 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 48, now)
    expect(c!.status).toBe("overdue")
    expect(c!.label).toBe("Overdue by 2d 4h")
  })

  it("null phase1SignedAt → null", () => {
    expect(computeClock(null)).toBeNull()
  })

  it("goldStandardHours=24 scales thresholds (20hr elapsed → red)", () => {
    const now = Date.now()
    const signed = new Date(now - 20 * 60 * 60 * 1000).toISOString()
    const c = computeClock(signed, 24, now)
    expect(c!.status).toBe("red")
    expect(c!.hoursRemaining).toBeGreaterThan(3)
    expect(c!.hoursRemaining).toBeLessThan(5)
  })
})
