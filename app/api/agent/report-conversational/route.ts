import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import {
  answerInvestigatorQuestion,
  startInvestigatorConversation,
} from "@/lib/agents/expert_investigator/graph"
import { getSession } from "@/lib/agents/expert_investigator/session_store"
import { updateInvestigationProgressOnTimeout } from "@/lib/db"

/** Vercel / serverless: allow this route to run long enough for chained LLM calls (plan limit may still cap). */
export const maxDuration = 60
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INTERNAL_TIMEOUT_MS = 45_000

const PARTIAL_MESSAGE =
  "Analysis is taking longer than expected. Your progress has been saved. WAiK will continue processing — please check back in a moment."

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`TIMEOUT_${ms}`)), ms)
  })
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("TIMEOUT_")
}

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
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const body = (await request.json()) as AgentRequestBody
    const validation = validateRequestBody(body)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (body.action === "start") {
      if (!user.facilityId) {
        return NextResponse.json({ error: "No facility assigned to user" }, { status: 400 })
      }
      const narrative = body.initialNarrative ?? body.narrative ?? ""
      try {
        const result = await Promise.race([
          startInvestigatorConversation({
            incidentId: body.incidentId,
            facilityId: user.facilityId,
            narrative,
            investigatorId: body.investigatorId,
            investigatorName: body.investigatorName,
            assignedStaffIds: body.assignedStaffIds,
            reporterName: body.reporterName,
          }),
          createTimeout(INTERNAL_TIMEOUT_MS),
        ])
        return NextResponse.json(result, { status: 200 })
      } catch (err) {
        if (!isTimeoutError(err)) {
          throw err
        }
        try {
          await updateInvestigationProgressOnTimeout(body.incidentId, user.facilityId, 0)
        } catch (saveErr) {
          console.error("[report-conversational] Timeout: could not update incident:", saveErr)
        }
        return NextResponse.json(
          {
            status: "partial" as const,
            sessionId: null,
            incidentId: body.incidentId,
            questions: [] as { id: string; text: string }[],
            message: PARTIAL_MESSAGE,
          },
          { status: 200 },
        )
      }
    }

    if (!(await getSession(body.sessionId))) {
      return NextResponse.json(
        { error: "Session not found or expired. Please start a new report." },
        { status: 404 },
      )
    }

    try {
      const result = await Promise.race([
        answerInvestigatorQuestion({
          sessionId: body.sessionId,
          questionId: body.questionId,
          answerText: body.answerText,
          answeredBy: body.answeredBy,
          answeredByName: body.answeredByName,
          method: body.method,
          assignedStaffIds: body.assignedStaffIds,
        }),
        createTimeout(INTERNAL_TIMEOUT_MS),
      ])
      return NextResponse.json(result, { status: 200 })
    } catch (err) {
      if (!isTimeoutError(err)) {
        throw err
      }
      const session = await getSession(body.sessionId)
      const incidentId = session?.incidentId ?? ""
      const completeness = session?.completenessScore ?? 0
      if (user.facilityId && incidentId) {
        try {
          await updateInvestigationProgressOnTimeout(incidentId, user.facilityId, completeness)
        } catch (saveErr) {
          console.error("[report-conversational] Timeout: could not update incident:", saveErr)
        }
      }
      return NextResponse.json(
        {
          status: "partial" as const,
          sessionId: body.sessionId,
          incidentId,
          questions: [] as { id: string; text: string }[],
          message: PARTIAL_MESSAGE,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[report-conversational] Error:", error)
    return NextResponse.json({ error: "Failed to process investigator agent request" }, { status: 500 })
  }
}
