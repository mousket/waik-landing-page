import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"
import type { Question } from "@/lib/types"
import type { IncidentAnswerSearchResult } from "@/lib/agents/vector-search"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import {
  answerTextFromQuestion,
  isQuestionSubstantivelyAnswered,
} from "@/lib/staff-incident-access"

type IncidentQuestionRow = {
  id?: string
  questionText?: string
  askedBy?: string
  askedAt?: Date | string
  generatedBy?: string
  metadata?: { idt?: boolean }
  priority?: { phase?: string }
  answer?: unknown
}

function areaHintForQuestion(
  questionId: string,
  incidentType: string,
  tier: "tier1" | "tier2" | "closing",
): string {
  if (tier === "tier2") return "Follow-up"
  const pack = TIER1_BY_TYPE[incidentType] ?? []
  const fromTier1 = pack.find((q) => q.id === questionId)
  if (fromTier1) return fromTier1.areaHint
  const fromClosing = CLOSING_QUESTIONS.find((q) => q.id === questionId)
  if (fromClosing) return fromClosing.areaHint
  return "General"
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 2)
}

function scoreQuestionMatch(query: string, questionText: string, answerText: string): number {
  const tokens = tokenize(query)
  if (tokens.length === 0) return 0

  const hay = `${questionText} ${answerText}`.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (hay.includes(token)) score += 1
  }

  const q = query.toLowerCase()
  if (/(resident|who fell|patient|name)/.test(q) && /(resident|room|name)/.test(hay)) {
    score += 2
  }
  if (/(discover|found|witness|saw)/.test(q) && /(discover|found|witness|saw)/.test(hay)) {
    score += 2
  }
  if (/(injur|hurt|bruise|bleed|pain)/.test(q) && /(injur|hurt|bruise|bleed|pain|swell)/.test(hay)) {
    score += 2
  }
  if (/(report|staff|nurse|who filed)/.test(q) && /(report|staff|nurse|filed)/.test(hay)) {
    score += 1
  }

  return score
}

/**
 * Keyword-ranked citations from stored incident Q&A when vector search is empty.
 * Falls back to the most recent substantive answers so the LLM still has context.
 */
export function rankIncidentQuestionCitations(
  questions: IncidentQuestionRow[] | undefined,
  incidentType: string,
  query: string,
  topK = 10,
): IncidentAnswerSearchResult[] {
  const ranked: Array<{ score: number; row: IncidentAnswerSearchResult }> = []

  for (const q of questions ?? []) {
    if (!isQuestionSubstantivelyAnswered(q)) continue

    const asQuestion = {
      id: q.id ?? "",
      questionText: q.questionText ?? "",
      askedBy: q.askedBy ?? "",
      askedAt:
        q.askedAt instanceof Date
          ? q.askedAt.toISOString()
          : String(q.askedAt ?? ""),
      generatedBy: q.generatedBy,
      metadata: q.metadata,
      priority: q.priority,
    } as Question

    const tier = staffQuestionGroup(asQuestion)
    if (tier === "idt") continue

    const answerText = answerTextFromQuestion(q)
    const questionText = String(q.questionText ?? "").trim()
    if (!questionText || !answerText) continue

    const score = scoreQuestionMatch(query, questionText, answerText)
    ranked.push({
      score,
      row: {
        questionText,
        answerText,
        tier,
        areaHint: areaHintForQuestion(q.id ?? "", incidentType, tier),
        score,
      },
    })
  }

  ranked.sort((a, b) => b.score - a.score)
  const withHits = ranked.filter((r) => r.score > 0)
  const pool = withHits.length > 0 ? withHits : ranked
  return pool.slice(0, Math.max(topK, 1)).map((r) => r.row)
}

export function reporterCitation(reporterName: string): IncidentAnswerSearchResult | null {
  const name = reporterName.trim()
  if (!name) return null
  return {
    questionText: "Who filed and reported this incident?",
    answerText: name,
    tier: "tier1",
    areaHint: "Reporter",
    score: 1,
  }
}

export function residentCitation(
  residentName: string,
  residentRoom: string,
): IncidentAnswerSearchResult | null {
  const name = residentName.trim()
  if (!name) return null
  const room = residentRoom.trim()
  return {
    questionText: "Which resident is this incident about?",
    answerText: room ? `${name}, Room ${room}` : name,
    tier: "tier1",
    areaHint: "Resident",
    score: 1,
  }
}

/** Merge header citations when the question is about resident or reporter. */
export function enrichCitationsForQuery(
  citations: IncidentAnswerSearchResult[],
  query: string,
  header: { residentName: string; residentRoom: string; reporterName: string },
): IncidentAnswerSearchResult[] {
  const q = query.toLowerCase()
  const extra: IncidentAnswerSearchResult[] = []

  if (/(resident|who fell|patient|room|name)/.test(q)) {
    const row = residentCitation(header.residentName, header.residentRoom)
    if (row) extra.push(row)
  }
  if (/(report|staff|nurse|filed|discover)/.test(q)) {
    const row = reporterCitation(header.reporterName)
    if (row) extra.push(row)
  }

  const seen = new Set<string>()
  const merged = [...extra, ...citations].filter((c) => {
    const key = `${c.questionText}::${c.answerText}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return merged.slice(0, 12)
}
