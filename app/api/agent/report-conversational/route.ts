import { type NextRequest, NextResponse } from "next/server"
import { createIncident, addQuestion } from "@/lib/db"

export async function POST(request: NextRequest) {
  console.log("[v0] Conversational report API called")

  try {
    const body = await request.json()
    const { narrative, followUp1, followUp2, followUp3, followUp4, reportedBy, reportedByName } = body

    console.log("[v0] Processing conversational report...")

    // Parse resident name and room from narrative (simple extraction)
    const nameMatch = narrative.match(
      /(?:resident|patient|person)?\s*(?:name(?:d)?(?:\s+is)?|called)?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    )
    const roomMatch = narrative.match(/room\s*(?:number)?\s*(\d+)/i)

    const residentName = nameMatch ? nameMatch[1] : "Unknown Resident"
    const roomNumber = roomMatch ? roomMatch[1] : "Unknown"

    console.log("[v0] Extracted - Name:", residentName, "Room:", roomNumber)

    // Create incident
    const incident = createIncident({
      title: `Conversational Report - ${residentName} (Room ${roomNumber})`,
      description: narrative,
      residentName,
      roomNumber,
      status: "open",
      priority: "medium",
      reportedBy: reportedBy || "unknown",
      reportedByName: reportedByName || "Unknown User",
      initialReport: {
        narrative,
        enhancedNarrative: narrative,
        createdBy: reportedBy || "unknown",
        createdByName: reportedByName || "Unknown User",
        createdAt: new Date().toISOString(),
        method: "voice",
      },
    })

    console.log("[v0] Incident created:", incident.id)

    // Add follow-up questions with answers
    const questions = [
      {
        question: "Was the floor wet or cluttered at the time of the incident?",
        answer: followUp1,
      },
      {
        question: "What was the resident wearing on their feet?",
        answer: followUp2,
      },
      {
        question: "Were there any witnesses to the incident?",
        answer: followUp3,
      },
      {
        question: "What was the lighting like in the area where the incident occurred?",
        answer: followUp4,
      },
    ]

    questions.forEach((q) => {
      addQuestion(incident.id, {
        question: q.question,
        askedBy: "ai-agent",
        askedByName: "WAiK Agent",
        assignedTo: [],
        source: "ai-generated",
        generatedBy: "conversational-agent",
        answer: {
          text: q.answer,
          answeredBy: reportedByName || "Unknown User",
          method: "voice",
        },
      })
    })

    console.log("[v0] Added", questions.length, "answered questions")

    // Generate report score (mock scoring based on response lengths)
    const totalLength = narrative.length + followUp1.length + followUp2.length + followUp3.length + followUp4.length
    const avgLength = totalLength / 5

    let score = 6 // Base score
    if (avgLength > 100) score = 8
    if (avgLength > 150) score = 9
    if (avgLength > 200) score = 10

    const feedback =
      score >= 9
        ? "Excellent report! Your detailed responses provide comprehensive information that will help prevent future incidents."
        : score >= 7
          ? "Good report. You provided solid information with enough detail for follow-up and analysis."
          : "Your report has been recorded. Consider adding more details in future reports for better incident analysis."

    console.log("[v0] Report score:", score)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      score,
      feedback,
    })
  } catch (error) {
    console.error("[v0] Error creating conversational report:", error)
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}
