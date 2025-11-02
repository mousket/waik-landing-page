import { NextResponse } from "next/server"
import { getIncidentById } from "@/lib/db"
import type { Incident } from "@/lib/types"

function getMockRAGResponse(question: string, incident: Incident): string {
  const lowerQuestion = question.toLowerCase()

  // Question patterns and responses
  if (lowerQuestion.includes("what happened") || lowerQuestion.includes("summary")) {
    return `Based on the incident report, ${incident.residentName} in Room ${incident.residentRoom} experienced ${incident.title.toLowerCase()}. The incident was reported by ${incident.staffName} and is currently marked as ${incident.status}. ${incident.description}`
  }

  if (lowerQuestion.includes("when") || lowerQuestion.includes("time")) {
    return `The incident occurred on ${new Date(incident.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${new Date(incident.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. It was last updated on ${new Date(incident.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
  }

  if (lowerQuestion.includes("who") || lowerQuestion.includes("involved") || lowerQuestion.includes("staff")) {
    return `The incident involves resident ${incident.residentName} from Room ${incident.residentRoom}. The reporting staff member is ${incident.staffName}. ${incident.questions.length > 0 ? `There are ${incident.questions.length} follow-up questions being addressed by the care team.` : ""}`
  }

  if (lowerQuestion.includes("status") || lowerQuestion.includes("progress")) {
    const answered = incident.questions.filter((q) => q.answer).length
    const total = incident.questions.length
    return `The incident status is currently "${incident.status}" with a priority level of "${incident.priority}". ${total > 0 ? `Out of ${total} follow-up questions, ${answered} have been answered by staff.` : "No follow-up questions have been added yet."}`
  }

  if (lowerQuestion.includes("priority") || lowerQuestion.includes("urgent") || lowerQuestion.includes("serious")) {
    return `This incident has been classified as "${incident.priority}" priority. ${incident.priority === "high" || incident.priority === "urgent" ? "This requires immediate attention and follow-up from the care team." : "The care team is monitoring this situation appropriately."}`
  }

  if (lowerQuestion.includes("question") || lowerQuestion.includes("follow-up") || lowerQuestion.includes("asked")) {
    const answered = incident.questions.filter((q) => q.answer)
    const unanswered = incident.questions.filter((q) => !q.answer)
    return `There are ${incident.questions.length} total questions related to this incident. ${answered.length} have been answered and ${unanswered.length} are still pending. ${unanswered.length > 0 ? `The pending questions include: ${unanswered.map((q) => q.questionText).join("; ")}` : ""}`
  }

  if (lowerQuestion.includes("resident") || lowerQuestion.includes("patient")) {
    return `The resident involved is ${incident.residentName}, located in Room ${incident.residentRoom}. ${incident.description.includes("injury") || incident.description.includes("fall") ? "Medical assessment and appropriate care protocols have been initiated." : "The resident's wellbeing is being monitored by the care team."}`
  }

  if (lowerQuestion.includes("prevent") || lowerQuestion.includes("future") || lowerQuestion.includes("avoid")) {
    return `To prevent similar incidents in the future, the care team should review the circumstances that led to this event. Key preventive measures may include enhanced monitoring, environmental modifications, updated care protocols, and staff training. A comprehensive incident review will identify specific action items.`
  }

  if (lowerQuestion.includes("action") || lowerQuestion.includes("next step") || lowerQuestion.includes("do now")) {
    return `Recommended next steps: 1) Ensure all follow-up questions are answered by assigned staff, 2) Complete a thorough incident review with the care team, 3) Update the resident's care plan if needed, 4) Document any environmental or procedural changes, and 5) Schedule follow-up monitoring to ensure resident safety.`
  }

  // Default response
  return `Based on the incident data, I can tell you that this ${incident.priority} priority incident involving ${incident.residentName} in Room ${incident.residentRoom} is currently ${incident.status}. The incident "${incident.title}" was reported by ${incident.staffName}. Is there a specific aspect of this incident you'd like to know more about?`
}

/**
 * Ask a question about an incident using AI intelligence (RAG)
 * NOTE: Currently using mock responses. RAG implementation pending.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { question } = body

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Get incident
    const incident = getIncidentById(id)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    console.log("[API] Processing intelligence question for incident:", id)
    const answer = getMockRAGResponse(question, incident)

    console.log("[API] Intelligence answer generated (mock)")
    return NextResponse.json({
      success: true,
      question,
      answer,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[API] Error in intelligence Q&A:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to answer question" },
      { status: 500 },
    )
  }
}
