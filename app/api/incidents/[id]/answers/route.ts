import { type NextRequest, NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { answerQuestion, getIncidentForUser } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const { id } = await params
    const body = await request.json()
    const { questionId, answerText, answeredBy, method = "text" } = body

    if (!questionId || !answerText || !answeredBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const scope = await getIncidentForUser(id, sessionUser)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const facilityId = scope.incident.facilityId ?? sessionUser.facilityId
    if (!facilityId) {
      return NextResponse.json({ error: "Incident has no facility" }, { status: 400 })
    }

    const answer = {
      id: `a-${Date.now()}`,
      questionId,
      answerText,
      answeredBy,
      answeredAt: new Date().toISOString(),
      method,
    }

    const updatedQuestion = await answerQuestion(id, facilityId, questionId, answer)

    if (!updatedQuestion) {
      return NextResponse.json({ error: "Incident or question not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, answer: updatedQuestion.answer })
  } catch (error) {
    console.error("[v0] Error saving answer:", error)
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 })
  }
}
