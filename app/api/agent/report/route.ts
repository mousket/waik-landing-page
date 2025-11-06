import { type NextRequest, NextResponse } from "next/server"
import { createIncident, addQuestion } from "@/lib/db"

const MOCK_QUESTIONS = [
  "Was the floor wet or cluttered at the time of the incident?",
  "Were the bed's brakes locked when the incident occurred?",
  "What was the resident wearing on their feet?",
  "Was the resident using any assistive devices (walker, cane, wheelchair)?",
  "What time did the incident occur?",
  "Were there any witnesses to the incident?",
  "Was the call light within reach of the resident?",
  "Had the resident been assessed for fall risk?",
  "What was the lighting like in the area where the incident occurred?",
  "Were there any environmental hazards present (loose rugs, cords, etc.)?",
  "How is the resident doing now? What is their current state? Do they have any visible injuries, bruises, or complaints of pain?",
  "What is the condition of the room and environment? Is there anything notable about the room, furniture placement, or environmental factors that could be relevant?",
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { residentName, roomNumber, narrative, residentState, environmentNotes, reportedBy, reportedByName } = body

    console.log("[v0] Creating incident with data:", {
      residentName,
      roomNumber,
      narrative,
      residentState,
      environmentNotes,
    })

    // Validate required fields
    if (!residentName || !roomNumber || !narrative) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let fullDescription = narrative
    if (residentState) {
      fullDescription += `\n\nResident State: ${residentState}`
    }
    if (environmentNotes) {
      fullDescription += `\n\nEnvironment Notes: ${environmentNotes}`
    }

    // Create the incident
    const incident = createIncident({
      title: `Incident - ${residentName} (Room ${roomNumber})`,
      description: fullDescription,
      residentName,
      roomNumber,
      status: "open",
      priority: "medium",
      reportedBy: reportedBy || "unknown",
      reportedByName: reportedByName || "Unknown User",
    })

    console.log("[v0] Incident created with ID:", incident.id)

    let questionsAdded = 0
    MOCK_QUESTIONS.forEach((questionText) => {
      const success = addQuestion(incident.id, {
        question: questionText,
        askedBy: "ai-agent",
        askedByName: "WAiK Agent",
        assignedTo: [],
        source: "ai-generated",
        generatedBy: "ai-agent",
      })
      if (success) questionsAdded++
    })

    console.log("[v0] Questions added:", questionsAdded)

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      questionsGenerated: questionsAdded,
    })
  } catch (error) {
    console.error("[v0] Error creating incident:", error)
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
