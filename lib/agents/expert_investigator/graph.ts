import { randomUUID } from "node:crypto"

import { addQuestionToIncident, getIncidentById } from "@/lib/db"
import type { AgentState } from "@/lib/gold_standards"
import { analyzeNarrativeAndScore } from "./analyze"
import { generateGapQuestions, collectMissingFields, type MissingFieldDescriptor } from "./gap_questions"
import { fillGapsWithAnswer } from "./fill_gaps"
import { recordAnswerAndSync } from "./state_sync"
import { finalizeInvestigation } from "./finalize"
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
  type InvestigatorSession,
  type PendingQuestion,
} from "./session_store"

interface StartConversationInput {
  incidentId: string
  facilityId: string
  narrative?: string
  investigatorId: string
  investigatorName: string
  assignedStaffIds?: string[]
  reporterName: string
}

interface StartConversationResult {
  sessionId: string
  incidentId: string
  score: number
  completenessScore: number
  feedback: string
  strengths: string[]
  gaps: string[]
  questions: PendingQuestion[]
  missingFieldLabels: string[]
  subtypeLabel?: string
}

interface AnswerQuestionInput {
  sessionId: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredByName: string
  method?: "text" | "voice"
  assignedStaffIds?: string[]
}

interface AnswerQuestionResult {
  sessionId: string
  incidentId: string
  status: "pending" | "completed"
  score: number
  completenessScore: number
  feedback: string
  nextQuestions: PendingQuestion[]
  updatedFields: string[]
  remainingMissing: string[]
  details?: {
    strengths: string[]
    gaps: string[]
  }
  breakdown: {
    completeness: number
  }
}

function formatSubtypeLabel(subType?: string | null): string | undefined {
  switch (subType) {
    case "fall-bed":
      return "bed-related fall"
    case "fall-wheelchair":
      return "wheelchair fall"
    case "fall-slip":
      return "slip or trip"
    case "fall-lift":
      return "lift or transfer incident"
    default:
      return undefined
  }
}

async function upsertQuestionsForIncident(
  incidentId: string,
  facilityId: string,
  questionTexts: string[],
  investigatorId: string,
  investigatorName: string,
  assignedStaffIds?: string[],
  options: { excludeTexts?: string[] } = {},
): Promise<PendingQuestion[]> {
  const pending: PendingQuestion[] = []
  const excludeSet = new Set((options.excludeTexts ?? []).map((text) => text.trim().toLowerCase()))

  const existingIncident = await getIncidentById(incidentId, facilityId)
  const existingQuestions = existingIncident?.questions ?? []
  const normalizedExisting = new Map<string, (typeof existingQuestions)[number]>()

  for (const existing of existingQuestions) {
    normalizedExisting.set(existing.questionText.trim().toLowerCase(), existing)
  }

  for (const rawText of questionTexts) {
    const normalizedText = rawText.trim().toLowerCase()
    if (!normalizedText || excludeSet.has(normalizedText)) {
      continue
    }

    const existing = normalizedExisting.get(normalizedText)
    if (existing) {
      if (existing.answer) {
        continue
      }

      pending.push({
        id: existing.id,
        text: existing.questionText,
        askedBy: existing.askedBy,
        assignedTo: existing.assignedTo,
        askedAt: existing.askedAt,
      })
      continue
    }

    const question = await addQuestionToIncident(incidentId, facilityId, {
      questionText: rawText,
      askedBy: investigatorId,
      askedByName: investigatorName,
      assignedTo: assignedStaffIds,
      source: "ai-generated",
      generatedBy: "live-expert-investigator",
      metadata: {
        createdVia: "system",
        assignedStaffIds: assignedStaffIds,
      },
    })

    if (question) {
      normalizedExisting.set(normalizedText, question)
      pending.push({
        id: question.id,
        text: question.questionText,
        askedBy: question.askedBy,
        assignedTo: question.assignedTo,
        askedAt: question.askedAt,
      })
    }
  }

  return pending
}

function ensureStateTracked(
  state: AgentState,
  score: number,
  feedback: string,
  filled: string[],
  missing: string[],
  completeness: number,
) {
  state.score = score
  state.completenessScore = completeness
  state.feedback = feedback
  state.filledFields = filled
  state.missingFields = missing
}

function supplementQuestions(
  baseQuestions: string[],
  missingFields: MissingFieldDescriptor[],
  minCount: number,
  maxCount = 6,
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

export async function startInvestigatorConversation(
  input: StartConversationInput,
): Promise<StartConversationResult> {
  const incident = await getIncidentById(input.incidentId, input.facilityId)
  if (!incident) {
    throw new Error(`Incident ${input.incidentId} not found`)
  }

  const narrative =
    input.narrative ??
    incident.initialReport?.narrative ??
    incident.description ??
    incident.summary ??
    "No detailed narrative provided."

  const analyzerResult = await analyzeNarrativeAndScore(narrative)
  ensureStateTracked(
    analyzerResult.state,
    analyzerResult.score,
    analyzerResult.feedback,
    analyzerResult.filledFields,
    analyzerResult.missingFields,
    analyzerResult.completenessScore,
  )

  const subtypeLabel = formatSubtypeLabel(analyzerResult.state.sub_type)

  const gapResult = await generateGapQuestions(analyzerResult.state, {
    responderName: input.reporterName,
    subtypeLabel,
    maxQuestions: 6,
  })
  const minFollowups =
    gapResult.missingFields.length > 0 ? Math.min(6, Math.max(3, gapResult.missingFields.length)) : gapResult.questions.length
  const supplementedQuestions =
    gapResult.missingFields.length > 0
      ? supplementQuestions(gapResult.questions, gapResult.missingFields, minFollowups)
      : gapResult.questions

  const pendingQuestions = await upsertQuestionsForIncident(
    input.incidentId,
    input.facilityId,
    supplementedQuestions,
    input.investigatorId,
    input.investigatorName,
    input.assignedStaffIds,
    {
      excludeTexts: [],
    },
  )

  const sessionId = randomUUID()
  const session: InvestigatorSession = {
    id: sessionId,
    incidentId: input.incidentId,
    facilityId: input.facilityId,
    investigatorId: input.investigatorId,
    investigatorName: input.investigatorName,
    nurseName: input.reporterName,
    state: analyzerResult.state,
    score: analyzerResult.score,
    completenessScore: analyzerResult.completenessScore,
    feedback: analyzerResult.feedback,
    baseScore: analyzerResult.score,
    baseCompletenessScore: analyzerResult.completenessScore,
    baseFeedback: analyzerResult.feedback,
    baseStrengths: analyzerResult.filledFields,
    baseGaps: analyzerResult.missingFields,
    pendingQuestions,
    missingFields: gapResult.missingFields,
    askedQuestionIds: [],
    askedQuestions: [],
    answersGiven: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await createSession(session)

  return {
    sessionId,
    incidentId: input.incidentId,
    score: analyzerResult.score,
    completenessScore: analyzerResult.completenessScore,
    feedback: analyzerResult.feedback,
    strengths: analyzerResult.filledFields,
    gaps: analyzerResult.missingFields,
    questions: pendingQuestions,
    missingFieldLabels: gapResult.missingFields.map((field) => field.label),
    subtypeLabel,
  }
}

export async function answerInvestigatorQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionResult> {
  const session = await getSession(input.sessionId)
  if (!session) {
    throw new Error(`Investigator session ${input.sessionId} not found`)
  }

  const pendingQuestion = session.pendingQuestions.find((q) => q.id === input.questionId)
  if (!pendingQuestion) {
    throw new Error(`Question ${input.questionId} is not active for this session`)
  }

  const contextState = {
    incidentId: session.incidentId,
    facilityId: session.facilityId,
    agentState: session.state,
    questions: session.pendingQuestions.map((q) => ({
      id: q.id,
      questionText: q.text,
      askedAt: q.askedAt ?? new Date().toISOString(),
      askedBy: q.askedBy ?? input.answeredBy,
    })),
  }

  await recordAnswerAndSync({
    context: contextState,
    questionId: pendingQuestion.id,
    answerText: input.answerText,
    answeredBy: input.answeredBy,
    method: input.method ?? "text",
  })

  const fillResult = await fillGapsWithAnswer({
    state: session.state,
    answerText: input.answerText,
    questionText: pendingQuestion.text,
    missingFields: session.missingFields,
  })

  const nextState = fillResult.state

  const newMissingLabels = fillResult.remainingMissing.map((field) => field.label)

  let newPendingQuestions: PendingQuestion[] = session.pendingQuestions.filter((q) => q.id !== pendingQuestion.id)

  if (fillResult.remainingMissing.length > 0) {
    const nextQuestionsResult = await generateGapQuestions(nextState, {
      responderName: session.nurseName,
      subtypeLabel: formatSubtypeLabel(nextState.sub_type),
      previousQuestions: [...session.askedQuestions, pendingQuestion.text],
      lastAnswer: input.answerText,
      maxQuestions: 6,
    })
    const minNext =
      nextQuestionsResult.missingFields.length > 0
        ? Math.min(6, Math.max(3, nextQuestionsResult.missingFields.length))
        : nextQuestionsResult.questions.length
    const supplementedNextQuestions =
      nextQuestionsResult.missingFields.length > 0
        ? supplementQuestions(nextQuestionsResult.questions, nextQuestionsResult.missingFields, minNext)
        : nextQuestionsResult.questions

    if (supplementedNextQuestions.length === 0) {
      const remainingDescriptors = collectMissingFields(nextState)

      await updateSession(input.sessionId, (current) => ({
        ...current,
        state: nextState,
        pendingQuestions: newPendingQuestions,
        missingFields: remainingDescriptors,
        score: current.baseScore,
        completenessScore: current.baseCompletenessScore,
        feedback: current.baseFeedback,
        askedQuestionIds: [...current.askedQuestionIds, pendingQuestion.id],
        askedQuestions: [...current.askedQuestions, pendingQuestion.text],
        answersGiven: current.answersGiven + 1,
      }))

      await finalizeInvestigation({
        incidentId: session.incidentId,
        facilityId: session.facilityId,
        state: nextState,
        investigatorId: session.investigatorId,
        investigatorName: session.investigatorName,
        score: session.baseScore,
        completenessScore: session.baseCompletenessScore,
        feedback: session.baseFeedback,
      })

      await deleteSession(input.sessionId)

      return {
        sessionId: input.sessionId,
        incidentId: session.incidentId,
        status: "completed",
        score: session.baseScore,
        completenessScore: session.baseCompletenessScore,
        feedback: session.baseFeedback,
        nextQuestions: [],
        updatedFields: fillResult.updatedFields,
        remainingMissing: remainingDescriptors.map((field) => field.label),
        details: {
          strengths: session.baseStrengths,
          gaps: session.baseGaps.length > 0 ? session.baseGaps : remainingDescriptors.map((d) => d.label),
        },
        breakdown: {
          completeness: session.baseCompletenessScore,
        },
      }
    }

    const newQuestions = await upsertQuestionsForIncident(
      session.incidentId,
      session.facilityId,
      supplementedNextQuestions,
      session.investigatorId,
      session.investigatorName,
      input.assignedStaffIds,
      {
        excludeTexts: [...session.askedQuestions, pendingQuestion.text],
      },
    )

    newPendingQuestions = [...newPendingQuestions, ...newQuestions]

    await updateSession(input.sessionId, (current) => ({
      ...current,
      state: nextState,
      pendingQuestions: newPendingQuestions,
      missingFields: nextQuestionsResult.missingFields,
      score: current.baseScore,
      completenessScore: current.baseCompletenessScore,
      feedback: current.baseFeedback,
      askedQuestionIds: [...current.askedQuestionIds, pendingQuestion.id],
      askedQuestions: [...current.askedQuestions, pendingQuestion.text],
      answersGiven: current.answersGiven + 1,
    }))

    return {
      sessionId: input.sessionId,
      incidentId: session.incidentId,
      status: "pending",
      score: session.baseScore,
      completenessScore: session.baseCompletenessScore,
      feedback: session.baseFeedback,
      nextQuestions: newPendingQuestions,
      updatedFields: fillResult.updatedFields,
      remainingMissing: newMissingLabels,
      details: {
        strengths: session.baseStrengths,
        gaps: session.baseGaps,
      },
      breakdown: {
        completeness: session.baseCompletenessScore,
      },
    }
  }

  // Finalize when no missing fields remain
  await updateSession(input.sessionId, (current) => ({
    ...current,
    state: nextState,
    pendingQuestions: newPendingQuestions,
    missingFields: fillResult.remainingMissing,
    score: current.baseScore,
    completenessScore: current.baseCompletenessScore,
    feedback: current.baseFeedback,
    askedQuestionIds: [...current.askedQuestionIds, pendingQuestion.id],
    askedQuestions: [...current.askedQuestions, pendingQuestion.text],
    answersGiven: current.answersGiven + 1,
  }))

  await finalizeInvestigation({
    incidentId: session.incidentId,
    facilityId: session.facilityId,
    state: nextState,
    investigatorId: session.investigatorId,
    investigatorName: session.investigatorName,
    score: session.baseScore,
    completenessScore: session.baseCompletenessScore,
    feedback: session.baseFeedback,
  })

  await deleteSession(input.sessionId)

  return {
    sessionId: input.sessionId,
    incidentId: session.incidentId,
    status: "completed",
    score: session.baseScore,
    completenessScore: session.baseCompletenessScore,
    feedback: session.baseFeedback,
    nextQuestions: [],
    updatedFields: fillResult.updatedFields,
    remainingMissing: [],
    details: {
      strengths: session.baseStrengths,
      gaps: session.baseGaps,
    },
    breakdown: {
      completeness: session.baseCompletenessScore,
    },
  }
}

