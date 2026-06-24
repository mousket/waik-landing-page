import connectMongo from "@/backend/src/lib/mongodb"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"
import type { ReportSession } from "@/lib/config/report-session"
import type { Question } from "@/lib/types"
import { upsertAnswerEmbedding } from "@/lib/agents/answer-embedding-service"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import {
  answerTextFromQuestion,
  isQuestionSubstantivelyAnswered,
} from "@/lib/staff-incident-access"
import { buildQuestionsFromReportSession } from "@/lib/report/sync-session-to-incident"

type EmbedTier = "tier1" | "tier2" | "closing"

function areaHintForQuestion(
  questionId: string,
  incidentType: string,
  tier: EmbedTier,
): string {
  if (tier === "tier2") return "Follow-up"
  const pack = TIER1_BY_TYPE[incidentType] ?? []
  const fromTier1 = pack.find((q) => q.id === questionId)
  if (fromTier1) return fromTier1.areaHint
  const fromClosing = CLOSING_QUESTIONS.find((q) => q.id === questionId)
  if (fromClosing) return fromClosing.areaHint
  return "General"
}

function tierForQuestion(q: Question): EmbedTier | null {
  const group = staffQuestionGroup(q)
  if (group === "idt") return null
  return group
}

export async function embedIncidentQuestionAnswer(input: {
  incidentId: string
  facilityId: string
  incidentType: string
  residentName: string
  residentRoom?: string
  questionId: string
  questionText: string
  answerText: string
  tier: EmbedTier
}): Promise<boolean> {
  const answerText = input.answerText.trim()
  if (!answerText) return false

  await upsertAnswerEmbedding({
    incidentId: input.incidentId,
    facilityId: input.facilityId,
    questionId: input.questionId,
    questionText: input.questionText,
    answerText,
    tier: input.tier,
    areaHint: areaHintForQuestion(input.questionId, input.incidentType, input.tier),
    incidentType: input.incidentType,
    residentName: input.residentName,
    residentRoom: input.residentRoom,
  })
  return true
}

export async function backfillAnswerVectorsFromSession(session: ReportSession): Promise<number> {
  const docs = buildQuestionsFromReportSession(session)
  let embedded = 0

  for (const doc of docs) {
    const answerText = doc.answer?.answerText?.trim() ?? ""
    if (!answerText) continue
    if (!isQuestionSubstantivelyAnswered({ answer: { answerText } })) continue

    const tier = tierForQuestion({
      id: doc.id,
      questionText: doc.questionText,
      askedBy: doc.askedBy,
      askedAt: doc.askedAt.toISOString(),
      generatedBy: doc.generatedBy,
      priority: doc.priority,
    } as Question)
    if (!tier) continue

    const ok = await embedIncidentQuestionAnswer({
      incidentId: session.incidentId,
      facilityId: session.facilityId,
      incidentType: session.incidentType,
      residentName: session.residentName,
      residentRoom: session.residentRoom,
      questionId: doc.id,
      questionText: doc.questionText,
      answerText,
      tier,
    })
    if (ok) embedded += 1
  }

  return embedded
}

export async function backfillIncidentAnswerVectors(
  incidentId: string,
  facilityId: string,
): Promise<number> {
  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = (await IncidentModel.findOne({ id: incidentId, facilityId })
    .select(
      "id facilityId incidentType residentName residentRoom staffName questions staffId",
    )
    .lean()
    .exec()) as Pick<
    IncidentDocument,
    "id" | "facilityId" | "incidentType" | "residentName" | "residentRoom" | "staffName" | "questions"
  > | null

  if (!incident) return 0

  let embedded = 0
  const incidentType = incident.incidentType ?? "fall"
  const residentName = incident.residentName ?? ""
  const residentRoom = incident.residentRoom ?? ""

  for (const q of incident.questions ?? []) {
    if (!isQuestionSubstantivelyAnswered(q)) continue

    const tier = tierForQuestion({
      id: q.id,
      questionText: q.questionText,
      askedBy: q.askedBy,
      askedAt: q.askedAt instanceof Date ? q.askedAt.toISOString() : String(q.askedAt),
      generatedBy: q.generatedBy,
      metadata: q.metadata,
      priority: q.priority,
    } as Question)
    if (!tier) continue

    const answerText = answerTextFromQuestion(q)
    const ok = await embedIncidentQuestionAnswer({
      incidentId,
      facilityId,
      incidentType,
      residentName,
      residentRoom,
      questionId: q.id,
      questionText: q.questionText,
      answerText,
      tier,
    })
    if (ok) embedded += 1
  }

  // Reporter name is not always captured in a Q&A pair — index as a lightweight record.
  const reporter = String(incident.staffName ?? "").trim()
  if (reporter) {
    const ok = await embedIncidentQuestionAnswer({
      incidentId,
      facilityId,
      incidentType,
      residentName,
      residentRoom,
      questionId: "__meta_reporter__",
      questionText: "Who filed and reported this incident?",
      answerText: reporter,
      tier: "tier1",
    })
    if (ok) embedded += 1
  }

  return embedded
}

export function countSubstantiveIncidentAnswers(questions: IncidentDocument["questions"]): number {
  return (questions ?? []).filter((q) => isQuestionSubstantivelyAnswered(q)).length
}
