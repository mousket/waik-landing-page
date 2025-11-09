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

    const totalLength = narrative.length + followUp1.length + followUp2.length + followUp3.length + followUp4.length
    const avgLength = totalLength / 5

    let score = 6
    if (avgLength > 100) score = 8
    if (avgLength > 150) score = 9
    if (avgLength > 200) score = 10

    const feedback =
      score >= 9
        ? "You did an excellent job describing the resident's condition and the environmental details. Next time, try to also include any safety equipment positions."
        : score >= 7
          ? "You provided solid information about the incident and context. Next time, try to include more specific details about the resident's footwear and nearby safety equipment."
          : "You provided the basic incident details. Next time, try to include more specific details about environmental factors, footwear, and safety equipment placement."

    const whatYouDidWell: string[] = []
    const whatWasMissed: string[] = []

    // Analyze narrative
    if (narrative.length > 50) {
      whatYouDidWell.push("You provided a detailed initial narrative")
    }
    if (narrative.toLowerCase().includes("room")) {
      whatYouDidWell.push("You identified the room number")
    }
    if (/resident|patient|person/i.test(narrative)) {
      whatYouDidWell.push("You identified the resident involved")
    }

    // Analyze follow-ups
    if (followUp1.length > 20) {
      whatYouDidWell.push("You described the floor condition clearly")
    } else {
      whatWasMissed.push("More detail about floor conditions (wet, dry, obstacles) would help prevent future incidents")
    }

    if (followUp2.length > 15) {
      whatYouDidWell.push("You noted the resident's footwear")
    } else {
      whatWasMissed.push("We still needed to know the **type of footwear** the resident was wearing")
    }

    if (followUp3.length > 20) {
      whatYouDidWell.push("You identified witnesses to the incident")
    } else {
      whatWasMissed.push("Information about witnesses helps corroborate incident details")
    }

    if (followUp4.length > 15) {
      whatYouDidWell.push("You described the lighting conditions")
    } else {
      whatWasMissed.push("We still needed to know if the **lighting was adequate** in the area")
    }

    // Always add some gaps for coaching
    if (!whatWasMissed.length || whatWasMissed.length < 2) {
      whatWasMissed.push("Consider mentioning if the **call light was in reach** of the resident")
      whatWasMissed.push("Consider noting if any **mobility aids** (walker, cane) were nearby")
    }

    console.log("[v0] Report score:", score)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      score,
      feedback,
      whatYouDidWell,
      whatWasMissed,
    })
  } catch (error) {
    console.error("[v0] Error creating conversational report:", error)
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}
