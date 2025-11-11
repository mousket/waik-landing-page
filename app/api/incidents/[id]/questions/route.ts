import { NextResponse } from "next/server"
import { addQuestionToIncident } from "@/lib/db"
import { getQuestionEmbedding } from "@/lib/embeddings"
import { isOpenAIConfigured } from "@/lib/openai"

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
      assignedTo: body.assignedTo || undefined, // Staff IDs to assign this question to
      source: body.source || "manual",
      generatedBy: body.generatedBy,
    }

    const success = await addQuestionToIncident(id, question)

    if (!success) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // AUTO-VECTORIZATION: Pre-generate embedding for unanswered question with FULL METADATA
    // This ensures traceability: question → admin who asked
    if (isOpenAIConfigured()) {
      getQuestionEmbedding(id, question.id, question.questionText, question.askedBy, question.askedAt, undefined, {
        assignedTo: question.assignedTo,
        reporterId: body.reporterId,
        reporterName: body.reporterName,
        reporterRole: body.reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      })
        .then(() => {
          console.log("[v0] Auto-vectorized question:", question.id)
        })
        .catch((err) => {
          console.error("[v0] Auto-vectorization failed (non-critical):", err)
        })
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error("[v0] Error adding question:", error)
    return NextResponse.json({ error: "Failed to add question" }, { status: 500 })
  }
}
