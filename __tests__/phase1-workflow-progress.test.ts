import { describe, expect, it } from "vitest"
import {
  computePhase1WorkflowPercent,
  computeWorkflowFromAnswerMap,
} from "@/lib/report/phase1-workflow-progress"

describe("computePhase1WorkflowPercent", () => {
  it("caps in-progress reports below sign-off weight", () => {
    const pct = computePhase1WorkflowPercent(
      {
        tier1Total: 5,
        tier1Answered: 5,
        tier2Generated: true,
        tier2Total: 10,
        tier2Answered: 3,
        closingTotal: 3,
        closingAnswered: 0,
      },
      "phase_1_in_progress",
    )
    expect(pct).toBe(39)
    expect(pct).toBeLessThan(90)
  })

  it("includes sign-off weight after phase 1 complete", () => {
    const pct = computePhase1WorkflowPercent(
      {
        tier1Total: 5,
        tier1Answered: 5,
        tier2Generated: true,
        tier2Total: 10,
        tier2Answered: 10,
        closingTotal: 3,
        closingAnswered: 3,
      },
      "phase_1_complete",
    )
    expect(pct).toBe(95)
  })
})

describe("computeWorkflowFromAnswerMap", () => {
  it("does not treat deferred answers as tier2 progress", () => {
    const pct = computeWorkflowFromAnswerMap({
      tier1Ids: ["t1-q1", "t1-q2"],
      tier2Ids: ["t2-q1", "t2-q2"],
      closingIds: ["c1", "c2", "c3"],
      answers: {
        "t1-q1": "yes",
        "t1-q2": "yes",
        "t2-q1": "__DEFERRED__",
      },
      tier2Generated: true,
    })
    expect(pct).toBeLessThan(50)
  })
})
