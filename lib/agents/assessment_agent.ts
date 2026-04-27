import { randomUUID } from "node:crypto"

import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import {
  type ActivityAssessmentStandards,
  type DietaryAssessmentStandards,
  ASSESSMENT_OPENING_QUESTION_ID,
  openingQuestionText,
  scoreCompleteness,
} from "@/lib/assessment_standards"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import { AI_CONFIG } from "@/lib/openai"
import {
  createAssessmentSession,
  deleteAssessmentSession,
  getAssessmentSession,
  updateAssessmentSession,
  type AssessmentAgentSession,
} from "./assessment_session_store"

const MAX_TURNS = 12

const ACTIVITY_FIELD_HELP = `Fields (activity): preferred_activities (string), activity_participation_level ("high"|"moderate"|"low"|"declined"|null), mobility_level ("independent"|"supervised"|"assisted"|"dependent"|null), social_preferences, barriers_to_participation, recent_engagement_changes, staff_observations, resident_stated_preferences (all strings).`

const DIETARY_FIELD_HELP = `Fields (dietary): appetite_level ("good"|"fair"|"poor"|null), food_preferences, food_aversions, texture_requirements ("regular"|"soft"|"minced"|"pureed"|"liquid"|null), fluid_intake_level ("adequate"|"borderline"|"inadequate"|null), recent_weight_changes, meal_assistance_needed (true|false|null), cultural_dietary_needs, reported_GI_issues, staff_observations (strings).`

export type StartAssessmentInput = {
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: "activity" | "dietary"
  conductedById: string
  conductedByName: string
  facilityId: string
  organizationId?: string
}

export type StartAssessmentResult = {
  sessionId: string
  assessmentId: string
  incidentId: string
  completenessScore: number
  questions: { id: string; text: string }[]
}

export type AnswerAssessmentInput = {
  sessionId: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredByName: string
  method?: "voice" | "text"
}

export type AnswerAssessmentResult = {
  sessionId: string
  assessmentId: string
  status: "pending" | "completed"
  completenessScore: number
  nextQuestions: { id: string; text: string }[]
  structuredOutput?: Record<string, unknown>
  rawNarrative?: string
  feedback?: string
}

type LlmNextStep = {
  structuredPatch: Record<string, unknown>
  isComplete: boolean
  nextQuestion: { id: string; text: string } | null
}

function newQId(): string {
  return `q-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function mergeStructured(
  type: "activity" | "dietary",
  current: Partial<ActivityAssessmentStandards> & Partial<DietaryAssessmentStandards>,
  patch: Record<string, unknown>,
): Partial<ActivityAssessmentStandards> & Partial<DietaryAssessmentStandards> {
  const out = { ...current } as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] = v
  }
  if (type === "activity") {
    return out as Partial<ActivityAssessmentStandards>
  }
  return out as Partial<DietaryAssessmentStandards>
}

function narrativeForSession(session: AssessmentAgentSession): string {
  return session.conversation
    .map((t) => `Q: ${t.questionText}\nA: ${t.answerText}`)
    .join("\n\n")
}

async function callLlmForNextStep(
  type: "activity" | "dietary",
  history: { q: string; a: string }[],
  lastAnswer: string,
  currentStructured: Record<string, unknown>
): Promise<LlmNextStep> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI not configured for assessment flow")
  }
  const fieldHelp = type === "activity" ? ACTIVITY_FIELD_HELP : DIETARY_FIELD_HELP
  const transcript = history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join("\n\n")
  const sys = `You are WAiK's assisted living assessment assistant. Merge the staff's latest answer into the structured record, then either finish or ask exactly ONE follow-up.

${fieldHelp}
Rules:
- For enum-like fields, only use allowed literals or null.
- For unknown free text use "".
- isComplete: true when most fields are filled well enough for documentation, or further questions would be redundant.
- If isComplete is true, set nextQuestion to null.
- If isComplete is false, nextQuestion must be one short, specific follow-up. Give nextQuestion a unique id.

Respond with JSON only:
{"structuredPatch":{...},"isComplete":boolean,"nextQuestion":null|{"id":"q-...","text":"..."}}`

  const user = `Current structured JSON: ${JSON.stringify(currentStructured)}

Transcript (previous Q/A):
${transcript}

Latest staff answer: ${lastAnswer}
`

  const res = await generateChatCompletion(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    {
      model: AI_CONFIG.model,
      maxTokens: 2000,
      response_format: { type: "json_object" },
    },
  )

  const text = res.choices[0]?.message?.content?.trim()
  if (!text) {
    return { structuredPatch: {}, isComplete: true, nextQuestion: null }
  }
  const parsed = JSON.parse(text) as LlmNextStep
  if (!parsed || typeof parsed.isComplete !== "boolean" || !parsed.structuredPatch) {
    return { structuredPatch: {}, isComplete: true, nextQuestion: null }
  }
  if (parsed.nextQuestion && !parsed.nextQuestion.id) {
    parsed.nextQuestion = { id: newQId(), text: parsed.nextQuestion.text }
  }
  return parsed
}

export async function startAssessmentConversation(input: StartAssessmentInput): Promise<StartAssessmentResult> {
  await connectMongo()
  const assessmentId = `assess-${randomUUID()}`
  const sessionId = randomUUID()
  const now = new Date()
  const openText = openingQuestionText(input.assessmentType, input.residentName)
  const activeQuestion = { id: ASSESSMENT_OPENING_QUESTION_ID, text: openText }

  await AssessmentModel.create({
    id: assessmentId,
    facilityId: input.facilityId,
    organizationId: input.organizationId,
    residentId: input.residentId,
    residentName: input.residentName,
    residentRoom: input.residentRoom,
    assessmentType: input.assessmentType,
    conductedById: input.conductedById,
    conductedByName: input.conductedByName,
    conductedAt: now,
    completenessScore: 0,
    status: "in_progress",
    narrativeRaw: "",
    structuredOutput: undefined,
    nextDueAt: undefined,
    createdAt: now,
    updatedAt: now,
  })

  const s: AssessmentAgentSession = {
    id: sessionId,
    assessmentId,
    facilityId: input.facilityId,
    organizationId: input.organizationId,
    residentId: input.residentId,
    residentName: input.residentName,
    residentRoom: input.residentRoom,
    assessmentType: input.assessmentType,
    conductedById: input.conductedById,
    conductedByName: input.conductedByName,
    activeQuestion,
    structured: {},
    conversation: [],
    askedQuestionIds: [ASSESSMENT_OPENING_QUESTION_ID],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await createAssessmentSession(s)
  return {
    sessionId,
    assessmentId,
    incidentId: assessmentId,
    completenessScore: 0,
    questions: [activeQuestion],
  }
}

function fallbackNoOpenAi(
  s: AssessmentAgentSession,
  answer: string,
  turnIndex: number,
): LlmNextStep {
  const prev = String(
    (s.structured as Record<string, unknown>).staff_observations ?? s.structured.staff_observations ?? "",
  )
  const combined = [prev, answer].map((x) => x.trim()).filter(Boolean).join(" — ")
  const patch = { staff_observations: combined } as Record<string, unknown>
  const merged = mergeStructured(s.assessmentType, s.structured, patch)
  const sc = scoreCompleteness(s.assessmentType, merged)
  const isComplete = turnIndex >= 3 || sc >= 70
  if (isComplete) {
    return { structuredPatch: patch, isComplete: true, nextQuestion: null }
  }
  return {
    structuredPatch: patch,
    isComplete: false,
    nextQuestion: { id: newQId(), text: "Is there anything else we should know for this area?" },
  }
}

function fallbackLlmError(s: AssessmentAgentSession, answer: string, turnIndex: number): LlmNextStep {
  return fallbackNoOpenAi(s, answer, turnIndex)
}

export async function answerAssessmentQuestion(input: AnswerAssessmentInput): Promise<AnswerAssessmentResult> {
  const s0 = await getAssessmentSession(input.sessionId)
  if (!s0) {
    throw new Error("SESSION_NOT_FOUND")
  }
  if (!s0.activeQuestion || s0.activeQuestion.id !== input.questionId) {
    throw new Error("QUESTION_MISMATCH")
  }
  const t = input.answerText?.trim()
  if (!t) {
    throw new Error("ANSWER_EMPTY")
  }

  const qText = s0.activeQuestion.text
  const history: { q: string; a: string }[] = s0.conversation.map((c) => ({
    q: c.questionText,
    a: c.answerText,
  }))

  const newTurn = {
    questionId: input.questionId,
    questionText: qText,
    answerText: t,
    at: Date.now(),
  }
  const turnIndex = s0.conversation.length + 1
  const forceOver = turnIndex >= MAX_TURNS

  let nextStep: LlmNextStep
  if (!isOpenAIConfigured()) {
    nextStep = fallbackNoOpenAi(s0, t, turnIndex)
  } else {
    try {
      nextStep = await callLlmForNextStep(
        s0.assessmentType,
        history,
        t,
        s0.structured as Record<string, unknown>,
      )
    } catch (e) {
      console.error("[assessment_agent] LLM error", e)
      nextStep = fallbackLlmError(s0, t, turnIndex)
    }
  }

  if (forceOver) {
    nextStep = { ...nextStep, isComplete: true, nextQuestion: null }
  }

  const updatedStructured = mergeStructured(s0.assessmentType, s0.structured, nextStep.structuredPatch)
  if (!nextStep.isComplete && !nextStep.nextQuestion) {
    nextStep = {
      ...nextStep,
      isComplete: false,
      nextQuestion: { id: newQId(), text: "Any other important details to capture?" },
    }
  }

  const s1: AssessmentAgentSession = {
    ...s0,
    conversation: [...s0.conversation, newTurn],
    askedQuestionIds: s0.askedQuestionIds.includes(input.questionId)
      ? s0.askedQuestionIds
      : [...s0.askedQuestionIds, input.questionId],
    structured: updatedStructured,
    activeQuestion: null,
    updatedAt: Date.now(),
  }

  const doComplete = nextStep.isComplete
  if (doComplete) {
    const narr = narrativeForSession(s1)
    await connectMongo()
    const now = new Date()
    const nextDue = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const c = Math.min(100, Math.max(0, scoreCompleteness(s0.assessmentType, s1.structured)))
    await AssessmentModel.findOneAndUpdate(
      { id: s0.assessmentId, facilityId: s0.facilityId },
      {
        $set: {
          narrativeRaw: narr,
          structuredOutput: s1.structured,
          completenessScore: c,
          status: "completed",
          conductedAt: now,
          nextDueAt: nextDue,
          updatedAt: now,
        },
      },
    )
    await deleteAssessmentSession(s0.id)
    return {
      sessionId: s0.id,
      assessmentId: s0.assessmentId,
      status: "completed",
      completenessScore: c,
      nextQuestions: [],
      structuredOutput: s1.structured as unknown as Record<string, unknown>,
      rawNarrative: narr,
      feedback: "Assessment completed.",
    }
  }

  const nq = nextStep.nextQuestion!
  const s2: AssessmentAgentSession = {
    ...s1,
    activeQuestion: { id: nq.id, text: nq.text },
    askedQuestionIds: s1.askedQuestionIds.includes(nq.id) ? s1.askedQuestionIds : [...s1.askedQuestionIds, nq.id],
  }
  await updateAssessmentSession(s0.id, () => s2)

  await connectMongo()
  const narrPartial = narrativeForSession(s2)
  const cPartial = Math.min(100, Math.max(0, scoreCompleteness(s0.assessmentType, s2.structured)))
  await AssessmentModel.findOneAndUpdate(
    { id: s0.assessmentId, facilityId: s0.facilityId },
    {
      $set: {
        narrativeRaw: narrPartial,
        structuredOutput: s2.structured,
        completenessScore: cPartial,
        status: "in_progress",
        updatedAt: new Date(),
      },
    },
  )

  return {
    sessionId: s0.id,
    assessmentId: s0.assessmentId,
    status: "pending",
    completenessScore: cPartial,
    nextQuestions: [s2.activeQuestion!],
  }
}
