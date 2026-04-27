import { describe, expect, it } from "vitest"
import { areAllPhase2SectionsComplete } from "@/lib/phase2-section-helpers"
import type { IncidentPhase2Sections } from "@/lib/types"

const allDone: IncidentPhase2Sections = {
  contributingFactors: { status: "complete", factors: ["a"] },
  rootCause: { status: "complete", description: "x".repeat(50) },
  interventionReview: { status: "complete", reviewedInterventions: [] },
  newIntervention: { status: "complete", interventions: [{ description: "d" }] },
}

describe("areAllPhase2SectionsComplete", () => {
  it("is false for empty", () => {
    expect(areAllPhase2SectionsComplete(undefined)).toBe(false)
  })

  it("is true when all four are complete", () => {
    expect(areAllPhase2SectionsComplete(allDone)).toBe(true)
  })

  it("is false when one is not started", () => {
    const p: IncidentPhase2Sections = { ...allDone, newIntervention: { ...allDone.newIntervention, status: "not_started" } }
    expect(areAllPhase2SectionsComplete(p)).toBe(false)
  })
})
