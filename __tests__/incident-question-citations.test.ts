import { describe, expect, it } from "vitest"
import {
  enrichCitationsForQuery,
  rankIncidentQuestionCitations,
  residentCitation,
} from "@/lib/agents/incident-question-citations"

describe("incident-question-citations", () => {
  const questions = [
    {
      id: "t1-q1",
      questionText: "Tell us everything that happened.",
      generatedBy: "tier-1-report",
      priority: { phase: "initial" },
      answer: { answerText: "Helen was found on the floor by Nurse Jane at 2pm." },
    },
    {
      id: "t2-q1",
      questionText: "What immediate injuries were observed?",
      generatedBy: "tier-2-gap",
      priority: { phase: "follow-up" },
      answer: { answerText: "Small bruise on left elbow, no lacerations." },
    },
  ]

  it("includes injury follow-up for injury query", () => {
    const rows = rankIncidentQuestionCitations(questions, "fall", "bruises or injuries", 5)
    expect(rows.some((r) => r.questionText.includes("injuries"))).toBe(true)
  })

  it("enrichCitationsForQuery adds resident header for name questions", () => {
    const enriched = enrichCitationsForQuery([], "who is the resident who fell", {
      residentName: "Helen Thompson",
      residentRoom: "515",
      reporterName: "Mousket Beaubrun",
    })
    expect(enriched.some((c) => c.answerText.includes("Helen Thompson"))).toBe(true)
  })

  it("residentCitation formats room", () => {
    expect(residentCitation("Helen Thompson", "515")?.answerText).toBe("Helen Thompson, Room 515")
  })
})
