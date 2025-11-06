import { type NextRequest, NextResponse } from "next/server"
import { createIncident, addQuestion } from "@/lib/db"

// Mock questions based on Scott's document
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
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { residentName, roomNumber, narrative, reportedBy, reportedByName } = body

    // Validate required fields
    if (!residentName || !roomNumber || !narrative) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create the incident
    const incident = createIncident({
      title: `Incident - ${residentName} (Room ${roomNumber})`,
      description: narrative,
      residentName,
      roomNumber,
      status: "open",
      priority: "medium",
      reportedBy: reportedBy || "unknown",
      reportedByName: reportedByName || "Unknown User",
    })

    // Add 10 mock questions to the incident
    MOCK_QUESTIONS.forEach((questionText) => {
      addQuestion(incident.id, {
        question: questionText,
        askedBy: "ai-agent",
        askedByName: "WAiK Agent",
        assignedTo: [], // Not assigned to anyone initially
        source: "ai-generated",
        generatedBy: "ai-agent",
      })
    })

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      questionsGenerated: MOCK_QUESTIONS.length,
    })
  } catch (error) {
    console.error("[API] Error creating incident:", error)
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
