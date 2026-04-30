import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import type { MissingFieldDescriptor } from "@/lib/agents/expert_investigator/gap_questions"
import type { ReportSession } from "@/lib/config/report-session"
import connectMongo from "@/backend/src/lib/mongodb"

export function normalizeQuestionText(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Mirrors expert investigator `supplementQuestions` (graph.ts) — not exported there. */
export function supplementTier2Questions(
  baseQuestions: string[],
  missingFields: MissingFieldDescriptor[],
  minCount: number,
  maxCount = 12,
): string[] {
  if (minCount <= 0) return baseQuestions
  const result = [...baseQuestions]
  const normalized = new Set(result.map((question) => question.toLowerCase()))
  const cappedMin = Math.min(minCount, maxCount)

  let pointer = 0
  while (result.length < cappedMin && pointer < missingFields.length) {
    const chunk = missingFields.slice(pointer, pointer + 3)
    pointer += 3
    const topics = chunk.map((field) => field.label.toLowerCase())
    const question =
      topics.length > 0
        ? `Could you walk me through ${topics.join(", ")}?`
        : "Could you share more specifics that might clarify the situation?"
    if (!normalized.has(question.toLowerCase())) {
      result.push(question)
      normalized.add(question.toLowerCase())
    }
  }

  while (result.length < cappedMin) {
    const generic =
      "Is there any other detail we should capture—observations, interventions, or staff actions?"
    if (!normalized.has(generic.toLowerCase())) {
      result.push(generic)
      normalized.add(generic.toLowerCase())
    } else {
      break
    }
  }

  return result.slice(0, maxCount)
}

export function allocateNewTier2Ids(existing: PendingQuestion[], needed: number): string[] {
  let max = existing.reduce((m, q) => {
    const match = /^t2-q(\d+)$/.exec(q.id)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return Array.from({ length: needed }, (_, i) => `t2-q${max + i + 1}`)
}

export function buildNextTier2Board(input: {
  session: ReportSession
  answeredQuestionId: string
  transcript: string
  supplementedTexts: string[]
}): {
  nextBoard: PendingQuestion[]
  questionsRemoved: string[]
  newQuestions: PendingQuestion[]
} {
  const { session, answeredQuestionId, transcript, supplementedTexts } = input
  const baseBoard = session.tier2Questions.filter((q) => q.id !== answeredQuestionId)
  const answersAfter = { ...session.tier2Answers, [answeredQuestionId]: transcript.trim() }
  const oldUnansweredIds = baseBoard
    .filter((q) => !session.tier2Answers[q.id]?.trim())
    .map((q) => q.id)

  if (supplementedTexts.length === 0) {
    const nextBoard = baseBoard.filter((q) => !answersAfter[q.id]?.trim())
    const newIds = new Set(nextBoard.map((q) => q.id))
    const questionsRemoved = oldUnansweredIds.filter(
      (id) => id !== answeredQuestionId && !newIds.has(id),
    )
    return { nextBoard, questionsRemoved, newQuestions: [] }
  }

  const nextBoard: PendingQuestion[] = []
  const matchedOld = new Set<string>()
  const pool = [...allocateNewTier2Ids([...session.tier2Questions], supplementedTexts.length)]

  for (const text of supplementedTexts) {
    const norm = normalizeQuestionText(text)
    const candidate = baseBoard.find(
      (q) =>
        !matchedOld.has(q.id) &&
        !answersAfter[q.id]?.trim() &&
        normalizeQuestionText(q.text) === norm,
    )
    if (candidate) {
      nextBoard.push(candidate)
      matchedOld.add(candidate.id)
    } else {
      const id = pool.shift() ?? `t2-q${Date.now()}-${nextBoard.length}`
      nextBoard.push({ id, text, askedAt: new Date().toISOString() })
    }
  }

  const newBoardIds = new Set(nextBoard.map((q) => q.id))
  const questionsRemoved = oldUnansweredIds.filter(
    (id) => id !== answeredQuestionId && !newBoardIds.has(id),
  )
  const baseIds = new Set(baseBoard.map((q) => q.id))
  const newQuestions = nextBoard.filter((q) => !baseIds.has(q.id))

  return { nextBoard, questionsRemoved, newQuestions }
}

export function goldFieldDisplayKeys(paths: string[]): string[] {
  return paths.map((p) => {
    if (p.startsWith("global.")) return p.slice("global.".length)
    if (p.startsWith("subtype.")) return p.slice("subtype.".length)
    return p
  })
}

/** Investigator completeness is 1–10; facility thresholds are 0–100. */
export function completenessToPercent(completenessScore: number | null | undefined): number {
  if (typeof completenessScore !== "number" || !Number.isFinite(completenessScore)) return 0
  return Math.min(100, Math.round(completenessScore * 10))
}

export function formatSubtypeLabel(subType?: string | null): string | undefined {
  switch (subType) {
    case "fall-bed":
      return "a bed-related fall"
    case "fall-wheelchair":
      return "a wheelchair-related fall"
    case "fall-slip":
      return "a slip or trip"
    case "fall-lift":
      return "a lift or transfer incident"
    default:
      return undefined
  }
}

export async function getFacilityFallCompletenessThreshold(facilityId: string): Promise<number> {
  await connectMongo()
  const { default: FacilityModel } = await import("@/backend/src/models/facility.model")
  const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).lean().exec()
  if (!fac || Array.isArray(fac)) return 75
  const raw = (fac as { completionThresholds?: { fall?: number } }).completionThresholds?.fall
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 75
}
