import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { addQuestionToIncident, getIncidentForUser } from "@/lib/db"
import { getQuestionEmbedding } from "@/lib/embeddings"
import { isOpenAIConfigured } from "@/lib/openai"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params
    const body = await request.json()

    const scope = await getIncidentForUser(id, user)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const facilityId = scope.incident.facilityId ?? user.facilityId
    if (!facilityId) {
      return NextResponse.json({ error: "Incident has no facility" }, { status: 400 })
    }

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

    const success = await addQuestionToIncident(id, facilityId, question)

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
