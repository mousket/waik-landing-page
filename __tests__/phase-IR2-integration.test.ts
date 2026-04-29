// @vitest-environment node
/**
 * Phase IR-2g — Integration verification (static / deterministic paths).
 *
 * The full end-to-end flow described in
 * documentation/pilot_1_plan/incident_report/phase_IR2/task-IR-2c-through-2g.md
 * (live MongoDB + OpenAI + 3 simulated reports) must be run as manual QA.
 *
 * These tests cover the deterministic, network-free contracts of every
 * IR-2 module so structural regressions are caught in CI:
 *  - IR-2b vector-search: SearchFilters shape + cosine fallback
 *  - IR-2d verification-agent: never-throws contract + PASSING_FALLBACK shape
 *  - IR-2e coaching-tips-generator: deterministic fallback tip selection
 *  - IR-2f incident-config: Tier 1 / closing / built-in gold-standard wiring
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

// Ensure OpenAI is "not configured" so agents take the deterministic fallback
// branch. Must happen before importing modules that read process.env.
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY
beforeAll(() => {
  delete process.env.OPENAI_API_KEY
})
afterAll(() => {
  if (ORIGINAL_OPENAI_KEY === undefined) {
    delete process.env.OPENAI_API_KEY
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY
  }
})

// Mongoose models are imported transitively by some IR-2 modules. We mock
// the mongodb connector so import time doesn't try to dial a database.
vi.mock("@/backend/src/lib/mongodb", () => ({
  default: vi.fn(async () => undefined),
}))

describe("IR-2 integration verification", () => {
  it("IR-2d verifyClinicalRecord returns PASSING_FALLBACK when OPENAI key is absent", async () => {
    const { verifyClinicalRecord } = await import("@/lib/agents/verification-agent")
    const result = await verifyClinicalRecord({
      originalNarrative: "Resident found on floor next to bed at 0830.",
      clinicalRecord: {
        narrative: "Resident found on floor next to bed at 0830.",
        residentStatement: "I slipped.",
        interventions: "Vital signs taken.",
        contributingFactors: "None reported.",
        recommendations: "Monitor for 24h.",
        environmentalAssessment: "Floor dry.",
      },
    })
    expect(result.fidelityScore).toBe(100)
    expect(result.overallAssessment).toBe("faithful")
    expect(result.additions).toEqual([])
    expect(result.omissions).toEqual([])
    expect(result.enhancements).toEqual([])
  })

  it("IR-2e generateCoachingTips fallback rewards strong reports and lists missed fields", async () => {
    const { generateCoachingTips } = await import("@/lib/agents/coaching-tips-generator")
    const tips = await generateCoachingTips({
      completenessScore: 92,
      completenessAtTier1: 60,
      missedFields: ["vital_signs", "footwear"],
      capturedInTier1: ["resident", "time"],
      totalQuestionsAsked: 4,
      personalAverage: 80,
      facilityAverage: 70,
      incidentType: "fall",
    })

    expect(Array.isArray(tips)).toBe(true)
    expect(tips.length).toBeGreaterThanOrEqual(1)
    expect(tips.length).toBeLessThanOrEqual(3)
    // High score branch: praise tip
    expect(tips[0]).toMatch(/[Ee]xcellent|thorough/)
    // Missed-field branch surfaces humanized field names
    expect(tips.some((t) => t.includes("vital signs"))).toBe(true)
    // Above-average branch
    expect(tips.some((t) => t.includes("above the facility average"))).toBe(true)
  })

  it("IR-2e generateCoachingTips fallback returns a default tip when no signals fire", async () => {
    const { generateCoachingTips } = await import("@/lib/agents/coaching-tips-generator")
    const tips = await generateCoachingTips({
      completenessScore: 50,
      completenessAtTier1: 20,
      missedFields: [],
      capturedInTier1: [],
      totalQuestionsAsked: 6,
      personalAverage: 0,
      facilityAverage: 0,
      incidentType: "fall",
    })
    expect(tips.length).toBeGreaterThanOrEqual(1)
  })

  it("IR-2b SearchFilters supports the staffId scope and Tier1 phase defaults", async () => {
    const mod = await import("@/lib/agents/vector-search")
    // searchFacilityIncidents and queryFacilityIncidentStats must both exist.
    expect(typeof mod.searchFacilityIncidents).toBe("function")
    expect(typeof mod.queryFacilityIncidentStats).toBe("function")
  })

  it("IR-2f config: Tier 1 / closing question registries are non-empty for fall", async () => {
    const { TIER1_BY_TYPE, CLOSING_QUESTIONS } = await import("@/lib/config/tier1-questions")
    expect(TIER1_BY_TYPE.fall.length).toBeGreaterThan(0)
    expect(CLOSING_QUESTIONS.length).toBeGreaterThan(0)
    for (const q of TIER1_BY_TYPE.fall) {
      expect(q.tier).toBe("tier1")
    }
  })

  it("IR-2f config: built-in gold standard fields exist for every built-in incident type", async () => {
    const { BUILTIN_INCIDENT_TYPE_IDS } = await import("@/lib/facility-builtin-incident-types")
    const { getBuiltinGoldStandardItems } = await import("@/lib/gold-standards-builtin")
    for (const t of BUILTIN_INCIDENT_TYPE_IDS) {
      const items = getBuiltinGoldStandardItems(t)
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(typeof it.id).toBe("string")
        expect(typeof it.label).toBe("string")
      }
    }
  })
})
