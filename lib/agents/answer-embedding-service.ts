import connectMongo from "@/backend/src/lib/mongodb"
import IncidentAnswerVectorModel from "@/backend/src/models/incident-answer-vector.model"
import { PLACEHOLDER_ANSWER_TEXTS } from "@/lib/staff-incident-access"
import { generateEmbedding, isOpenAIConfigured } from "@/lib/openai"

function composeEmbeddingText(params: {
  incidentType: string
  residentName: string
  residentRoom?: string
  tier: string
  areaHint: string
  questionText: string
  answerText: string
}): string {
  const room = params.residentRoom?.trim()
  const residentLine = room
    ? `${params.residentName}, Room ${room}`
    : params.residentName

  return [
    `Incident Type: ${params.incidentType}`,
    `Resident: ${residentLine}`,
    `Tier: ${params.tier} | Area: ${params.areaHint}`,
    `Question: ${params.questionText}`,
    `Answer: ${params.answerText}`,
  ].join("\n")
}

export async function upsertAnswerEmbedding(params: {
  incidentId: string
  facilityId: string
  questionId: string
  questionText: string
  answerText: string
  tier: "tier1" | "tier2" | "closing"
  areaHint: string
  incidentType: string
  residentName: string
  residentRoom?: string
}): Promise<void> {
  try {
    const answerText = params.answerText.trim()
    if (!answerText || PLACEHOLDER_ANSWER_TEXTS.has(answerText)) return

    if (!isOpenAIConfigured()) {
      console.warn("[answer-embedding] OPENAI_API_KEY not set; skipping per-answer embedding")
      return
    }

    const areaHint = params.areaHint?.trim() || "General"
    const text = composeEmbeddingText({ ...params, areaHint })
    const vector = await generateEmbedding(text)

    await connectMongo()
    await IncidentAnswerVectorModel.updateOne(
      { incidentId: params.incidentId, questionId: params.questionId },
      {
        $set: {
          facilityId: params.facilityId,
          questionText: params.questionText.trim(),
          answerText,
          tier: params.tier,
          areaHint,
          incidentType: params.incidentType,
          residentName: params.residentName,
          vector,
          embeddedAt: new Date(),
        },
      },
      { upsert: true },
    ).exec()
  } catch (err) {
    console.warn("[answer-embedding] upsert failed:", err)
  }
}
