import { type NextRequest, NextResponse } from "next/server"
import { answerQuestion } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { questionId, answerText, answeredBy, method = "text" } = body

    if (!questionId || !answerText || !answeredBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const answer = {
      id: `a-${Date.now()}`,
      questionId,
      answerText,
      answeredBy,
      answeredAt: new Date().toISOString(),
      method,
    }

    const success = answerQuestion(id, questionId, answer)

    if (!success) {
      return NextResponse.json({ error: "Incident or question not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, answer })
  } catch (error) {
    console.error("[v0] Error saving answer:", error)
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 })
  }
}
