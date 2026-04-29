// @vitest-environment node
/**
 * Phase IR-3f — Integration verification (static / deterministic paths).
 *
 * The full end-to-end journey described in
 * documentation/pilot_1_plan/incident_report/phase_IR3/task-IR-3a-through-3f.md
 * (Maria Torres → Margaret Chen fall, signed-off, embedded, surfaced
 *  in admin analytics + staff trajectory) must be exercised as manual QA
 * against a live stack.
 *
 * These tests cover the deterministic, network-free contracts of every
 * IR-3 module so structural regressions are caught in CI:
 *  - IR-3a route handlers exist and export GET
 *  - IR-3b weekly-report-generator: shape + atAGlance math + fallback narratives
 *  - IR-3c question-effectiveness ranking: grouping, scoring, count threshold
 *  - IR-3d staff-trajectory: empty result, metrics, streaks, trend classifier
 *  - IR-3e cleanup: legacy patterns absent from live source files
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

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

vi.mock("@/backend/src/lib/mongodb", () => ({
  default: vi.fn(async () => undefined),
}))

// Helper: construct a chainable Mongoose-like query that resolves to `rows`.
const makeFindChain = (rows: unknown) => {
  const chain: any = {
    sort: () => chain,
    select: () => chain,
    lean: () => chain,
    exec: async () => rows,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
  }
  return chain
}

describe("IR-3 integration verification", () => {
  it("IR-3a route handlers export GET for every analytics endpoint", async () => {
    const overview = await import("@/app/api/admin/analytics/overview/route")
    const staff = await import("@/app/api/admin/analytics/staff/route")
    const trends = await import("@/app/api/admin/analytics/trends/route")
    const questions = await import("@/app/api/admin/analytics/questions/route")
    const trajectory = await import("@/app/api/staff/analytics/trajectory/route")
    const weeklyCron = await import("@/app/api/cron/weekly-report/route")
    expect(typeof overview.GET).toBe("function")
    expect(typeof staff.GET).toBe("function")
    expect(typeof trends.GET).toBe("function")
    expect(typeof questions.GET).toBe("function")
    expect(typeof trajectory.GET).toBe("function")
    expect(typeof weeklyCron.GET).toBe("function")
  })

  it("IR-3b weekly report falls back gracefully and exposes atAGlance week-over-week math", async () => {
    vi.resetModules()
    let callCount = 0
    vi.doMock("@/lib/agents/vector-search", () => ({
      queryFacilityIncidentStats: vi.fn(async () => {
        callCount += 1
        // Generator calls (thisWeek, lastWeek) in that order.
        const isThisWeek = callCount === 1
        return {
          total: isThisWeek ? 5 : 2,
          byType: { fall: 3, behavioral: 2 },
          byLocation: { "Room 102": 2 },
          byResident: [{ residentName: "Margaret Chen", residentRoom: "102", count: 2 }],
          avgCompleteness: 88,
          avgActiveSeconds: 240,
        }
      }),
    }))
    vi.doMock("@/backend/src/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }))
    vi.doMock("@/backend/src/models/incident.model", () => ({
      default: { countDocuments: vi.fn(async () => 1) },
    }))

    const { generateWeeklyReport } = await import("@/lib/agents/weekly-report-generator")
    const report = await generateWeeklyReport("facility-1", new Date("2026-04-27T07:00:00Z"))

    expect(report.facilityId).toBe("facility-1")
    expect(report.sections.atAGlance.incidentsThisWeek).toBe(5)
    expect(report.sections.atAGlance.incidentsLastWeek).toBe(2)
    expect(report.sections.atAGlance.investigationsClosed).toBe(1)
    expect(report.sections.atAGlance.avgCompleteness).toBe(88)
    expect(typeof report.sections.completenessNarrative).toBe("string")
    expect(report.sections.completenessNarrative.length).toBeGreaterThan(0)
    expect(Array.isArray(report.sections.attentionNeeded)).toBe(true)
    expect(typeof report.sections.staffPerformance).toBe("string")
    vi.doUnmock("@/lib/agents/vector-search")
    vi.doUnmock("@/backend/src/models/incident.model")
  })

  it("IR-3c rankQuestionEffectiveness groups by normalized text, drops singletons, and sorts by score", async () => {
    vi.resetModules()
    vi.doMock("@/backend/src/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }))
    vi.doMock("@/backend/src/models/incident.model", () => ({
      IncidentModel: {
        find: () => ({
          select: () => ({
            lean: async () => [
              {
                dataPointsPerQuestion: [
                  { questionId: "q1", questionText: "What time did the fall occur?", dataPointsCovered: 4, fieldsCovered: ["time"] },
                  { questionId: "qX", questionText: "Singleton question", dataPointsCovered: 5, fieldsCovered: ["x"] },
                ],
              },
              {
                dataPointsPerQuestion: [
                  { questionId: "q1b", questionText: "  what time did the fall occur?  ", dataPointsCovered: 5, fieldsCovered: ["time", "witness"] },
                  { questionId: "q2", questionText: "Where did it happen?", dataPointsCovered: 2, fieldsCovered: ["location"] },
                ],
              },
              {
                dataPointsPerQuestion: [
                  { questionId: "q2", questionText: "where did it happen?", dataPointsCovered: 3, fieldsCovered: ["location"] },
                ],
              },
            ],
          }),
        }),
      },
    }))

    const { rankQuestionEffectiveness } = await import("@/lib/analytics/question-effectiveness")
    const rankings = await rankQuestionEffectiveness("facility-1")

    // Singleton ("Singleton question") filtered out — count >= 2 only
    expect(rankings.find((r) => /singleton/i.test(r.questionText))).toBeUndefined()
    expect(rankings.length).toBe(2)
    // Sorted by score descending; "what time" question outscores "where" (avgDP 4.5 vs 2.5)
    expect(rankings[0].questionText.toLowerCase()).toContain("what time")
    expect(rankings[0].timesAsked).toBe(2)
    expect(rankings[0].avgDataPointsCovered).toBeCloseTo(4.5, 5)
    expect(rankings[0].effectivenessScore).toBeGreaterThan(rankings[1].effectivenessScore)
    expect(rankings[0].effectivenessScore).toBeGreaterThanOrEqual(0)
    expect(rankings[0].effectivenessScore).toBeLessThanOrEqual(100)
    vi.doUnmock("@/backend/src/models/incident.model")
  })

  it("IR-3d getStaffTrajectory returns 'new' empty payload when no incidents", async () => {
    vi.resetModules()
    vi.doMock("@/backend/src/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }))
    vi.doMock("@/backend/src/models/incident.model", () => ({
      default: { find: () => makeFindChain([]) },
    }))
    const { getStaffTrajectory } = await import("@/lib/analytics/staff-trajectory")
    const t = await getStaffTrajectory("staff-1", "facility-1")
    expect(t.totalReports).toBe(0)
    expect(t.trend).toBe("new")
    expect(t.trajectory).toEqual([])
    vi.doUnmock("@/backend/src/models/incident.model")
  })

  it("IR-3d getStaffTrajectory computes streaks, first-5/last-5 deltas, and 'improving' trend", async () => {
    vi.resetModules()
    // 8 reports, scores rising over time → improvement should classify as improving.
    const incidents = [
      { id: "i1", staffName: "Maria Torres", completenessAtSignoff: 60, tier2QuestionsGenerated: 6, activeDataCollectionSeconds: 200, dataPointsPerQuestion: [{ dataPointsCovered: 2 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-03-01") } },
      { id: "i2", staffName: "Maria Torres", completenessAtSignoff: 65, tier2QuestionsGenerated: 5, activeDataCollectionSeconds: 220, dataPointsPerQuestion: [{ dataPointsCovered: 3 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-03-08") } },
      { id: "i3", staffName: "Maria Torres", completenessAtSignoff: 70, tier2QuestionsGenerated: 4, activeDataCollectionSeconds: 200, dataPointsPerQuestion: [{ dataPointsCovered: 3 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-03-15") } },
      { id: "i4", staffName: "Maria Torres", completenessAtSignoff: 75, tier2QuestionsGenerated: 4, activeDataCollectionSeconds: 180, dataPointsPerQuestion: [{ dataPointsCovered: 4 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-03-22") } },
      { id: "i5", staffName: "Maria Torres", completenessAtSignoff: 80, tier2QuestionsGenerated: 3, activeDataCollectionSeconds: 170, dataPointsPerQuestion: [{ dataPointsCovered: 4 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-03-29") } },
      { id: "i6", staffName: "Maria Torres", completenessAtSignoff: 88, tier2QuestionsGenerated: 3, activeDataCollectionSeconds: 160, dataPointsPerQuestion: [{ dataPointsCovered: 5 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-04-05") } },
      { id: "i7", staffName: "Maria Torres", completenessAtSignoff: 90, tier2QuestionsGenerated: 2, activeDataCollectionSeconds: 150, dataPointsPerQuestion: [{ dataPointsCovered: 5 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-04-12") } },
      { id: "i8", staffName: "Maria Torres", completenessAtSignoff: 92, tier2QuestionsGenerated: 2, activeDataCollectionSeconds: 140, dataPointsPerQuestion: [{ dataPointsCovered: 6 }], phaseTransitionTimestamps: { phase1Signed: new Date("2026-04-19") } },
    ]
    vi.doMock("@/backend/src/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }))
    vi.doMock("@/backend/src/models/incident.model", () => ({
      default: { find: () => makeFindChain(incidents) },
    }))
    const { getStaffTrajectory } = await import("@/lib/analytics/staff-trajectory")
    const t = await getStaffTrajectory("staff-1", "facility-1")

    expect(t.totalReports).toBe(8)
    expect(t.staffName).toBe("Maria Torres")
    expect(t.trajectory.length).toBe(8)

    // first-5 avg = (60+65+70+75+80)/5 = 70; last-5 = (80+88+90+92 + 75 wait)
    // last-5 from index 3..7 = (75+80+88+90+92)/5 = 85
    expect(t.metrics.avgCompletenessFirst5).toBe(70)
    expect(t.metrics.avgCompletenessLast5).toBe(85)
    expect(t.metrics.improvement).toBe(15)
    expect(t.trend).toBe("improving")

    // currentStreak walks back from i8 (92,90,88) above 85 = 3. i6=88 ≥85, i5=80 stops.
    expect(t.metrics.currentStreak).toBe(3)
    expect(t.metrics.bestStreak).toBe(3)
    expect(t.metrics.bestCompleteness).toBe(92)
    vi.doUnmock("@/backend/src/models/incident.model")
  })

  it("IR-3d 'declining' trend triggers when last-5 < first-5 by more than 5", async () => {
    vi.resetModules()
    const scores = [95, 92, 90, 88, 85, 70, 65, 60]
    const incidents = scores.map((s, i) => ({
      id: `d${i}`,
      staffName: "Decline Staff",
      completenessAtSignoff: s,
      tier2QuestionsGenerated: 3,
      activeDataCollectionSeconds: 180,
      dataPointsPerQuestion: [],
      phaseTransitionTimestamps: { phase1Signed: new Date(2026, 0, i + 1) },
    }))
    vi.doMock("@/backend/src/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }))
    vi.doMock("@/backend/src/models/incident.model", () => ({
      default: { find: () => makeFindChain(incidents) },
    }))
    const { getStaffTrajectory } = await import("@/lib/analytics/staff-trajectory")
    const t = await getStaffTrajectory("staff-1", "facility-1")
    expect(t.trend).toBe("declining")
    expect(t.metrics.improvement).toBeLessThan(-5)
    vi.doUnmock("@/backend/src/models/incident.model")
  })

  it("IR-3e: legacy patterns are absent from live TS sources outside historical-context comments", async () => {
    const { promises: fs } = await import("node:fs")
    const path = await import("node:path")

    // Walk a small allow-list of code roots; documentation/** is excluded by design.
    const roots = ["app", "lib", "hooks", "components", "backend", "scripts"]
    const matches: string[] = []
    const allowList = new Set([
      "lib/config/report-session.ts",
      "lib/db.ts",
    ])
    const ignoreDirs = new Set(["node_modules", ".next", "dist", "build", ".git"])

    async function walk(dir: string) {
      let entries: import("node:fs").Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const e of entries) {
        if (ignoreDirs.has(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          await walk(full)
        } else if (/\.(ts|tsx|js|jsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
          const rel = path.relative(process.cwd(), full).replace(/\\/g, "/")
          if (allowList.has(rel)) continue
          const content = await fs.readFile(full, "utf8")
          if (/InterviewWorkSession|interview-work|\/api\/agent\/(report|interview|investigate)|report-conversational/.test(content)) {
            matches.push(rel)
          }
        }
      }
    }

    for (const r of roots) await walk(path.join(process.cwd(), r))
    expect(matches).toEqual([])
  })
})
