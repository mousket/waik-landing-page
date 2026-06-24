import { describe, expect, it, vi } from "vitest"
import {
  countSubstantiveIncidentAnswers,
} from "@/lib/agents/backfill-incident-answer-vectors"

vi.mock("@/lib/agents/answer-embedding-service", () => ({
  upsertAnswerEmbedding: vi.fn().mockResolvedValue(undefined),
}))

describe("backfill-incident-answer-vectors", () => {
  it("countSubstantiveIncidentAnswers skips deferred placeholders", () => {
    const n = countSubstantiveIncidentAnswers([
      { answer: { answerText: "real answer" } },
      { answer: { answerText: "__DEFERRED__" } },
      { answer: { answerText: "" } },
    ] as never)
    expect(n).toBe(1)
  })
})
