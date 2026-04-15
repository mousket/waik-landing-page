import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { deleteQuestion, getIncidentForUser } from "@/lib/db"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id, questionId } = await params

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

    const success = await deleteQuestion(id, facilityId, questionId)

    if (!success) {
      return NextResponse.json({ error: "Question not found or already answered" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
