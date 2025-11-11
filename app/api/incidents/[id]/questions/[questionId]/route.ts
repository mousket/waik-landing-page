import { NextResponse } from "next/server"
import { deleteQuestion } from "@/lib/db"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { id, questionId } = await params

    const success = await deleteQuestion(id, questionId)

    if (!success) {
      return NextResponse.json({ error: "Question not found or already answered" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
