import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import {
  backfillIncidentAnswerVectors,
  countSubstantiveIncidentAnswers,
} from "@/lib/agents/backfill-incident-answer-vectors"
import { INCIDENT_INTELLIGENCE_COPY } from "@/lib/agents/incident-intelligence-copy"
import {
  enrichCitationsForQuery,
  rankIncidentQuestionCitations,
} from "@/lib/agents/incident-question-citations"
import { searchIncidentAnswers } from "@/lib/agents/vector-search"
import { getCurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"
import { staffCanReadIncident } from "@/lib/staff-incident-access"
import { modelForTask, generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type ConversationTurn = { question: string; answer: string }

function tierLabel(tier: string) {
  if (tier === "tier1") return "Tier 1"
  if (tier === "tier2") return "Tier 2"
  if (tier === "closing") return "Closing"
  return tier
}

function buildRagPrompt(
  citations: Awaited<ReturnType<typeof searchIncidentAnswers>>,
  question: string,
  conversationHistory: ConversationTurn[],
  incidentHeader: {
    incidentType: string
    residentName: string
    residentRoom: string
    reporterName: string
  },
): string {
  const records = citations
    .map(
      (c) =>
        `[${tierLabel(c.tier)} | ${c.areaHint}] Q: ${c.questionText}\nA: ${c.answerText}`,
    )
    .join("\n\n")

  const prior =
    conversationHistory.length > 0
      ? conversationHistory
          .slice(-4)
          .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
          .join("\n\n")
      : ""

  const header = [
    `Incident type: ${incidentHeader.incidentType || "unknown"}`,
    `Resident: ${incidentHeader.residentName || "unknown"}${incidentHeader.residentRoom ? `, Room ${incidentHeader.residentRoom}` : ""}`,
    `Reporter: ${incidentHeader.reporterName || "unknown"}`,
  ].join("\n")

  return `You are a clinical intelligence assistant for senior care.
Below are recorded Q&A from an incident report.
Answer the staff member's question using ONLY the information below.
If the answer is not in the records, say "I don't have enough information from this incident to answer that."

Incident header:
${header}

Incident records:
${records}
${prior ? `\nPrior conversation:\n${prior}\n` : ""}
New question: ${question}`
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facilityId = user.facilityId?.trim()
  if (!facilityId) {
    return NextResponse.json({ error: "Facility required" }, { status: 400 })
  }

  const { id } = await context.params
  const incidentId = String(id ?? "").trim()
  if (!incidentId) {
    return NextResponse.json({ error: "Invalid incident id" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }

  const rawHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : []
  const conversationHistory: ConversationTurn[] = rawHistory
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const q = typeof row.question === "string" ? row.question.trim() : ""
      const a = typeof row.answer === "string" ? row.answer.trim() : ""
      if (!q || !a) return null
      return { question: q, answer: a }
    })
    .filter((t): t is ConversationTurn => t !== null)

  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = leanOne<{
    staffId?: string
    staffName?: string
    residentName?: string
    residentRoom?: string
    incidentType?: string
    questions?: Array<{
      id?: string
      questionText?: string
      askedBy?: string
      askedAt?: Date | string
      generatedBy?: string
      metadata?: { idt?: boolean }
      priority?: { phase?: string }
      answer?: { answerText?: string }
    }>
  }>(
    await IncidentModel.findOne({ id: incidentId, facilityId })
      .select(
        "staffId staffName residentName residentRoom incidentType questions.id questions.questionText questions.askedBy questions.askedAt questions.generatedBy questions.metadata questions.priority questions.answer",
      )
      .lean()
      .exec(),
  )
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 })
  }
  if (!staffCanReadIncident(incident, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const incidentHeader = {
    incidentType: String(incident.incidentType ?? ""),
    residentName: String(incident.residentName ?? ""),
    residentRoom: String(incident.residentRoom ?? ""),
    reporterName: String(incident.staffName ?? ""),
  }
  const substantiveAnswers = countSubstantiveIncidentAnswers(
    incident.questions as Parameters<typeof countSubstantiveIncidentAnswers>[0],
  )

  if (!isOpenAIConfigured()) {
    return NextResponse.json({
      answer: INCIDENT_INTELLIGENCE_COPY.notAvailable,
      citations: [],
      incidentId,
      questionCount: 0,
    })
  }

  try {
    let citations = await searchIncidentAnswers(question, incidentId, facilityId, 10)

    if (citations.length === 0 && substantiveAnswers > 0) {
      console.log(
        `[staff/incidents/intelligence] No vectors for ${incidentId}; backfilling ${substantiveAnswers} answers`,
      )
      try {
        await backfillIncidentAnswerVectors(incidentId, facilityId)
        citations = await searchIncidentAnswers(question, incidentId, facilityId, 10)
      } catch (backfillErr) {
        console.warn("[staff/incidents/intelligence] Vector backfill failed:", backfillErr)
      }
    }

    if (citations.length === 0 && substantiveAnswers > 0) {
      console.log(
        `[staff/incidents/intelligence] Using direct Q&A fallback for ${incidentId}`,
      )
      citations = rankIncidentQuestionCitations(
        incident.questions,
        incidentHeader.incidentType || "fall",
        question,
        10,
      )
    }

    citations = enrichCitationsForQuery(citations, question, incidentHeader)

    if (citations.length === 0) {
      const answer =
        substantiveAnswers > 0
          ? INCIDENT_INTELLIGENCE_COPY.retrievalTrouble
          : INCIDENT_INTELLIGENCE_COPY.noAnswersYet
      return NextResponse.json({
        answer,
        citations: [],
        incidentId,
        questionCount: 0,
      })
    }

    const prompt = buildRagPrompt(citations, question, conversationHistory, incidentHeader)
    const completion = await generateChatCompletion(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, maxTokens: 500, model: modelForTask("ragAnswer") },
    )

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      INCIDENT_INTELLIGENCE_COPY.notEnoughInfo

    return NextResponse.json({
      answer,
      citations: citations.map((c) => ({
        questionText: c.questionText,
        answerText: c.answerText,
        tier: c.tier,
        areaHint: c.areaHint,
        score: c.score,
      })),
      incidentId,
      questionCount: citations.length,
    })
  } catch (err) {
    console.error("[staff/incidents/intelligence]", err)
    return NextResponse.json({ error: "Intelligence query failed" }, { status: 500 })
  }
}
