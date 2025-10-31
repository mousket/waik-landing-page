import { NextResponse } from "next/server"
import { addQuestionToIncident } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const question = {
      id: `q-${Date.now()}`,
      incidentId: id,
      questionText: body.questionText,
      askedBy: body.askedBy || "admin",
      askedAt: new Date().toISOString(),
    }

    const success = addQuestionToIncident(id, question)

    if (!success) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error("[v0] Error adding question:", error)
    return NextResponse.json({ error: "Failed to add question" }, { status: 500 })
  }
}
