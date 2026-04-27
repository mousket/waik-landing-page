import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse, authErrorResponse } from "@/lib/auth"
import { answerAssessmentQuestion, startAssessmentConversation } from "@/lib/agents/assessment_agent"

export const maxDuration = 60
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StartBody = {
  action: "start"
  residentId: string
  residentName: string
  residentRoom?: string
  assessmentType: "activity" | "dietary"
}

type AnswerBody = {
  action: "answer"
  sessionId: string
  questionId: string
  answerText: string
  /** Optional; when omitted, the signed-in staff user is used. */
  answeredBy?: string
  answeredByName?: string
  method?: "voice" | "text"
}

type Body = StartBody | AnswerBody

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  if (!user.facilityId) {
    return NextResponse.json({ error: "No facility assigned" }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Body
    if (!body || (body as Body).action === undefined) {
      return NextResponse.json({ error: "action is required" }, { status: 400 })
    }
    if ((body as Body).action !== "start" && (body as Body).action !== "answer") {
      return NextResponse.json({ error: "action must be start or answer" }, { status: 400 })
    }

    if ((body as StartBody).action === "start") {
      const s = body as StartBody
      if (!s.residentId) {
        return NextResponse.json({ error: "residentId is required" }, { status: 400 })
      }
      if (!s.assessmentType || (s.assessmentType !== "activity" && s.assessmentType !== "dietary")) {
        return NextResponse.json({ error: "assessmentType must be activity or dietary" }, { status: 400 })
      }
      const result = await startAssessmentConversation({
        residentId: s.residentId,
        residentName: s.residentName?.trim() || "Resident",
        residentRoom: (s.residentRoom ?? "").trim() || "—",
        assessmentType: s.assessmentType,
        conductedById: user.userId,
        conductedByName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User",
        facilityId: user.facilityId,
        organizationId: user.organizationId,
      })
      return NextResponse.json(result, { status: 200 })
    }

    const a = body as AnswerBody
    if (!a.sessionId || !a.questionId) {
      return NextResponse.json({ error: "sessionId and questionId are required" }, { status: 400 })
    }
    if (a.answerText == null) {
      return NextResponse.json({ error: "answerText is required" }, { status: 400 })
    }
    const answeredBy = a.answeredBy ?? user.userId
    const answeredByName =
      a.answeredByName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    const result = await answerAssessmentQuestion({
      sessionId: a.sessionId,
      questionId: a.questionId,
      answerText: a.answerText,
      answeredBy,
      answeredByName,
      method: a.method,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    if (msg === "SESSION_NOT_FOUND" || msg === "QUESTION_MISMATCH") {
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
    }
    if (msg === "ANSWER_EMPTY") {
      return NextResponse.json({ error: "answerText is empty" }, { status: 400 })
    }
    console.error("[api/agent/assessment]", err)
    return authErrorResponse(err)
  }
}
