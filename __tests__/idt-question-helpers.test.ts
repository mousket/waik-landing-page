import { describe, expect, it } from "vitest"
import { idtOpenQuestionCountForUser, isIdtQuestionOverdueForReminder } from "@/lib/idt-question-helpers"
import type { Question } from "@/lib/types"

describe("isIdtQuestionOverdueForReminder", () => {
  it("returns false within 24h", () => {
    const t = new Date("2026-01-10T12:00:00Z")
    const asked = t.toISOString()
    const now = new Date("2026-01-10T20:00:00Z")
    expect(isIdtQuestionOverdueForReminder(asked, now)).toBe(false)
  })

  it("returns true at or after 24h for pending", () => {
    const t = new Date("2026-01-10T12:00:00Z")
    const asked = t.toISOString()
    const now = new Date("2026-01-12T12:00:00Z")
    expect(isIdtQuestionOverdueForReminder(asked, now)).toBe(true)
  })
})

describe("idtOpenQuestionCountForUser", () => {
  it("counts open idt questions for user", () => {
    const q = [
      {
        id: "1",
        questionText: "A",
        askedBy: "x",
        askedAt: new Date().toISOString(),
        metadata: { idt: true },
        assignedTo: ["u1"],
      },
      {
        id: "2",
        questionText: "B",
        askedBy: "x",
        askedAt: new Date().toISOString(),
        metadata: { idt: true },
        assignedTo: ["u1"],
        answer: {
          id: "a1",
          questionId: "2",
          answerText: "ok",
          answeredBy: "u1",
          answeredAt: new Date().toISOString(),
          method: "text" as const,
        },
      },
      {
        id: "3",
        questionText: "C",
        askedBy: "x",
        askedAt: new Date().toISOString(),
        metadata: { idt: false },
        assignedTo: ["u1"],
      },
    ] satisfies Question[]
    expect(idtOpenQuestionCountForUser(q, "u1")).toBe(1)
  })
})
