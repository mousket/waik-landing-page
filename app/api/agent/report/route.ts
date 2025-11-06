import { type NextRequest, NextResponse } from "next/server"
import { createIncident, addQuestion } from "@/lib/db"
import { enhanceNarrative } from "@/lib/utils/enhance-narrative"

const INCIDENT_REPORT_QUESTIONS = [
  {
    key: "narrative",
    question: "What happened? Please describe the incident in detail.",
  },
  {
    key: "residentState",
    question:
      "How is the resident doing? What is their current state? Do they have any visible injuries, bruises, or complaints of pain?",
  },
  {
    key: "environmentNotes",
    question:
      "What is the condition of the room and environment? Is there anything notable about the room, furniture placement, or environmental factors that could be relevant?",
  },
]

const FOLLOW_UP_QUESTIONS = [
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
  console.log("[v0] ========================================")
  console.log("[v0] INCIDENT CREATION API CALLED")
  console.log("[v0] ========================================")

  try {
    const body = await request.json()
    const { residentName, roomNumber, narrative, residentState, environmentNotes, reportedBy, reportedByName } = body

    console.log("[v0] Request body received:", {
      residentName,
      roomNumber,
      narrativeLength: narrative?.length,
      residentStateLength: residentState?.length,
      environmentNotesLength: environmentNotes?.length,
      reportedBy,
      reportedByName,
    })

    // Validate required fields
    if (!residentName || !roomNumber || !narrative) {
      console.log("[v0] Validation failed - missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Generating enhanced narratives...")
    const enhancedNarrative = enhanceNarrative(narrative)
    const enhancedResidentState = residentState ? enhanceNarrative(residentState) : undefined
    const enhancedEnvironmentNotes = environmentNotes ? enhanceNarrative(environmentNotes) : undefined

    console.log("[v0] ✅ Enhanced narratives generated")
    console.log("[v0] Original narrative length:", narrative.length)
    console.log("[v0] Enhanced narrative length:", enhancedNarrative.length)

    console.log("[v0] Creating incident...")

    const incident = createIncident({
      title: `Incident - ${residentName} (Room ${roomNumber})`,
      description: enhancedNarrative,
      residentName,
      roomNumber,
      status: "open",
      priority: "medium",
      reportedBy: reportedBy || "unknown",
      reportedByName: reportedByName || "Unknown User",
      initialReport: {
        narrative,
        enhancedNarrative,
        residentState,
        enhancedResidentState,
        environmentNotes,
        enhancedEnvironmentNotes,
        createdBy: reportedBy || "unknown",
        createdByName: reportedByName || "Unknown User",
        createdAt: new Date().toISOString(),
        method: "voice",
      },
    })

    console.log("[v0] ✅ Incident created successfully!")
    console.log("[v0] Incident ID:", incident.id)
    console.log("[v0] Incident Title:", incident.title)
    console.log("[v0] Reported By:", incident.staffName, `(${incident.staffId})`)
    console.log("[v0] Initial Report included: ✅")

    console.log("[v0] Adding incident report answers as Q&A...")
    let answeredQuestionsAdded = 0

    const reportAnswers = {
      narrative: enhancedNarrative,
      residentState: enhancedResidentState,
      environmentNotes: enhancedEnvironmentNotes,
    }

    INCIDENT_REPORT_QUESTIONS.forEach((item) => {
      const answerText = reportAnswers[item.key as keyof typeof reportAnswers]
      if (answerText && answerText.trim()) {
        const success = addQuestion(incident.id, {
          question: item.question,
          askedBy: "ai-agent",
          askedByName: "WAiK Agent",
          assignedTo: [],
          source: "ai-generated",
          generatedBy: "voice-report",
          answer: {
            text: answerText,
            answeredBy: reportedByName || "Unknown User",
            method: "voice",
          },
        })
        if (success) {
          answeredQuestionsAdded++
          console.log(`[v0] ✅ Answered question added: ${item.question.substring(0, 50)}...`)
        }
      }
    })

    console.log("[v0] ✅ Incident report answers saved:", answeredQuestionsAdded, "/ 3")

    console.log("[v0] Adding follow-up questions...")
    let followUpQuestionsAdded = 0

    FOLLOW_UP_QUESTIONS.forEach((questionText, index) => {
      const success = addQuestion(incident.id, {
        question: questionText,
        askedBy: "ai-agent",
        askedByName: "WAiK Agent",
        assignedTo: [],
        source: "ai-generated",
        generatedBy: "ai-agent",
      })
      if (success) {
        followUpQuestionsAdded++
        console.log(`[v0] ✅ Follow-up question ${index + 1}/${FOLLOW_UP_QUESTIONS.length} added`)
      } else {
        console.log(`[v0] ❌ Follow-up question ${index + 1}/${FOLLOW_UP_QUESTIONS.length} failed`)
      }
    })

    console.log("[v0] ✅ Follow-up questions added:", followUpQuestionsAdded, "/", FOLLOW_UP_QUESTIONS.length)

    const totalQuestions = answeredQuestionsAdded + followUpQuestionsAdded

    console.log("[v0] ========================================")
    console.log("[v0] INCIDENT CREATION COMPLETE")
    console.log("[v0] Total Q&A pairs:", totalQuestions)
    console.log("[v0] - Answered:", answeredQuestionsAdded)
    console.log("[v0] - Unanswered:", followUpQuestionsAdded)
    console.log("[v0] ========================================")

    console.log("[v0] ⏳ Adding 3-second delay for demo animation...")
    await new Promise((resolve) => setTimeout(resolve, 3000))
    console.log("[v0] ✅ Demo delay complete, returning response")

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      questionsGenerated: totalQuestions,
      answeredQuestions: answeredQuestionsAdded,
      unansweredQuestions: followUpQuestionsAdded,
    })
  } catch (error) {
    console.error("[v0] ❌ ERROR creating incident:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
