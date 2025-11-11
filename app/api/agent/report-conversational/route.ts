import { NextResponse } from "next/server"
import {
  answerInvestigatorQuestion,
  startInvestigatorConversation,
} from "@/lib/agents/expert_investigator/graph"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StartActionBody = {
  action: "start"
  incidentId: string
  narrative?: string
  initialNarrative?: string
  investigatorId: string
  investigatorName: string
  assignedStaffIds?: string[]
  reporterName: string
}

type AnswerActionBody = {
  action: "answer"
  sessionId: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredByName: string
  method?: "text" | "voice"
  assignedStaffIds?: string[]
}

type AgentRequestBody = StartActionBody | AnswerActionBody

function validateRequestBody(body: AgentRequestBody): { valid: boolean; error?: string } {
  if (body.action === "start") {
    if (!body.incidentId) return { valid: false, error: "incidentId is required" }
    if (!body.investigatorId) return { valid: false, error: "investigatorId is required" }
    if (!body.investigatorName) return { valid: false, error: "investigatorName is required" }
    if (!body.reporterName) return { valid: false, error: "reporterName is required" }
    return { valid: true }
  }

  if (!body.sessionId) return { valid: false, error: "sessionId is required" }
  if (!body.questionId) return { valid: false, error: "questionId is required" }
  if (!body.answerText) return { valid: false, error: "answerText is required" }
  if (!body.answeredBy) return { valid: false, error: "answeredBy is required" }
  if (!body.answeredByName) return { valid: false, error: "answeredByName is required" }

  return { valid: true }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentRequestBody
    const validation = validateRequestBody(body)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (body.action === "start") {
      const narrative = body.initialNarrative ?? body.narrative ?? ""
      const result = await startInvestigatorConversation({
        incidentId: body.incidentId,
        narrative,
        investigatorId: body.investigatorId,
        investigatorName: body.investigatorName,
        assignedStaffIds: body.assignedStaffIds,
        reporterName: body.reporterName,
      })
      return NextResponse.json(result, { status: 200 })
    }

    const result = await answerInvestigatorQuestion({
      sessionId: body.sessionId,
      questionId: body.questionId,
      answerText: body.answerText,
      answeredBy: body.answeredBy,
      answeredByName: body.answeredByName,
      method: body.method,
      assignedStaffIds: body.assignedStaffIds,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[report-conversational] Error:", error)
    return NextResponse.json({ error: "Failed to process investigator agent request" }, { status: 500 })
  }
}
