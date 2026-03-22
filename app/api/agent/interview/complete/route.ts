import { NextResponse } from "next/server"
import { createIncidentFromReport, queueInvestigationQuestions } from "@/lib/db"
import { runInvestigationAgent } from "@/lib/agents/investigation_agent"
import { FINAL_CRITICAL_QUESTIONS } from "@/lib/gold_standards_extended"
import { isOpenAIConfigured, getOpenAI } from "@/lib/openai"

// Interface for interview questions passed from the client
interface InterviewQuestionInput {
  id: string
  text: string
  phase: "initial" | "follow-up" | "final-critical"
  goldStandardField?: string
  isCritical: boolean
}

// Interface for answers passed from the client
interface InterviewAnswerInput {
  questionId: string
  questionText?: string // The actual question text
  text: string
  answeredAt: string
  method: "voice" | "text"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      residentName,
      roomNumber,
      narrative,
      reportedById,
      reportedByName,
      reportedByRole,
      category,
      subtype,
      answers,
      questions, // The questions that were asked during the interview
      completenessScore,
      initialReportCardScore, // Static score calculated from narrative before questions
    } = body

    if (!residentName || !roomNumber || !narrative || !reportedById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[Interview Complete] Creating incident for:", residentName)

    // Generate a proper AI summary (not just concatenation)
    const aiSummary = await generateAISummary(narrative, answers, category, residentName)

    // Create the incident - enhanced narrative is now a proper AI summary
    // Q&A is saved separately as Question documents, not in the narrative
    const incident = await createIncidentFromReport({
      title: `${residentName} Incident Report`,
      narrative: narrative, // Keep original narrative clean
      residentName,
      residentRoom: roomNumber,
      reportedById,
      reportedByName,
      reportedByRole: reportedByRole || "staff",
      enhancedNarrative: aiSummary, // This is now a proper AI-generated summary
    })

    console.log("[Interview Complete] Incident created:", incident.id)
    
    // Store the static report card score in the investigation metadata
    if (initialReportCardScore !== undefined) {
      await storeReportCardScore(incident.id, initialReportCardScore, category, subtype)
    }

    // ======================================================================
    // NEW: Save initial interview questions with their answers to database
    // ======================================================================
    if (questions && questions.length > 0) {
      await saveInitialInterviewQuestions(
        incident.id,
        questions,
        answers,
        reportedById,
        reportedByName
      )
      console.log("[Interview Complete] Saved", questions.length, "initial interview questions")
    }

    // If completeness is below 70%, queue follow-up questions in background
    if (completenessScore < 70) {
      console.log("[Interview Complete] Completeness below 70%, queuing follow-up questions")
      
      // Run investigation agent to generate follow-up questions
      // This runs in background - don't await
      generateFollowUpQuestionsAsync(incident.id, reportedById, reportedByName, completenessScore)
    }

    // Queue final critical questions (these are always added)
    await queueFinalCriticalQuestions(incident.id, reportedById, reportedByName)

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      completenessScore,
      followUpQueued: completenessScore < 70,
      initialQuestionsCount: questions?.length || 0,
      answersCount: answers?.length || 0,
    })
  } catch (error) {
    console.error("[Interview Complete] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete interview" },
      { status: 500 }
    )
  }
}

/**
 * Generate a proper AI summary from the narrative and interview answers.
 * This creates a coherent, professional summary - not just concatenation.
 */
async function generateAISummary(
  originalNarrative: string,
  answers: Array<{ questionId: string; questionText?: string; text: string }> | undefined,
  category: string,
  residentName: string
): Promise<string> {
  // If no OpenAI or no answers, return a simple formatted version
  if (!isOpenAIConfigured() || !answers || answers.length === 0) {
    return originalNarrative
  }

  try {
    const openai = getOpenAI()
    
    // Build context from Q&A
    const qaContext = answers
      .filter((a) => a.questionText)
      .map((a, i) => `Q: ${a.questionText}\nA: ${a.text}`)
      .join("\n\n")

    const prompt = `You are a healthcare documentation specialist. Create a professional, cohesive incident summary from the following information.

INCIDENT TYPE: ${category || "Unknown"}
RESIDENT: ${residentName}

ORIGINAL NARRATIVE:
${originalNarrative}

ADDITIONAL INFORMATION FROM FOLLOW-UP QUESTIONS:
${qaContext}

INSTRUCTIONS:
- Write a single, flowing narrative that incorporates all relevant details
- Use professional healthcare language
- Organize information logically (what happened, when, where, who was involved, immediate actions taken, current status)
- Do NOT include the original Q&A format - synthesize the information naturally
- Keep the summary concise but complete (2-3 paragraphs)
- Start directly with the summary, no preamble

SUMMARY:`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    })

    const summary = response.choices[0]?.message?.content?.trim()
    
    if (summary && summary.length > 50) {
      return summary
    }
    
    // Fallback if AI response is too short
    return originalNarrative
  } catch (error) {
    console.error("[Interview Complete] Failed to generate AI summary:", error)
    // Fallback to original narrative
    return originalNarrative
  }
}

/**
 * Store the static report card score in the incident's investigation metadata.
 * This score is based on the INITIAL NARRATIVE ONLY and does not change.
 */
async function storeReportCardScore(
  incidentId: string,
  score: number,
  category: string,
  subtype: string | null
) {
  try {
    const IncidentModel = (await import("@/backend/src/models/incident.model")).default
    
    await IncidentModel.updateOne(
      { id: incidentId },
      {
        $set: {
          "investigation.score": score / 10, // Convert to 0-10 scale
          "investigation.completenessScore": score / 10,
          "investigation.subtype": subtype || undefined,
          "investigation.status": "in-progress",
          updatedAt: new Date(),
        },
      }
    )
    
    console.log("[Interview Complete] Stored report card score:", score, "for incident:", incidentId)
  } catch (error) {
    console.error("[Interview Complete] Failed to store report card score:", error)
    // Don't throw - this is not critical
  }
}

// ======================================================================
// NEW: Save initial interview questions and answers to database
// ======================================================================
async function saveInitialInterviewQuestions(
  incidentId: string,
  questions: InterviewQuestionInput[],
  answers: InterviewAnswerInput[] | undefined,
  reporterId: string,
  reporterName: string
) {
  try {
    // Create a map of answers by questionId for quick lookup
    const answerMap = new Map<string, InterviewAnswerInput>()
    if (answers) {
      answers.forEach((answer) => {
        answerMap.set(answer.questionId, answer)
      })
    }

    // Build questions with their answers attached
    const questionsToSave = questions.map((q, index) => {
      const answer = answerMap.get(q.id)
      
      return {
        questionText: q.text,
        askedBy: "system",
        askedByName: "WAiK Interview",
        assignedTo: [reporterId],
        source: "ai-generated" as const,
        generatedBy: "beta-interview-initial",
        priority: {
          phase: "initial" as const,
          order: index,
          isCritical: q.isCritical,
          goldStandardField: q.goldStandardField,
        },
        // Include answer data if available
        answer: answer ? {
          answerText: answer.text,
          answeredBy: reporterId,
          answeredByName: reporterName,
          answeredAt: answer.answeredAt,
          answerMethod: answer.method,
        } : undefined,
      }
    })

    // Use queueInvestigationQuestions to save, but we need to handle the answers differently
    // since the current function doesn't support pre-answered questions
    // We'll save them and then update with answers
    
    await queueInvestigationQuestions({
      incidentId,
      askedById: reporterId,
      askedByName: reporterName,
      questions: questionsToSave.map((q) => ({
        questionText: q.questionText,
        askedBy: q.askedBy,
        askedByName: q.askedByName,
        assignedTo: q.assignedTo,
        source: q.source,
        generatedBy: q.generatedBy,
        priority: q.priority,
      })),
      phase: "initial",
    })

    // Now we need to update the questions with their answers
    // Import the db functions we need
    const { getIncidentById, answerQuestion } = await import("@/lib/db")
    
    // Get the incident to find the questions we just created
    const incident = await getIncidentById(incidentId)
    if (!incident || !incident.questions) {
      console.error("[Interview Complete] Could not find incident to update answers")
      return
    }

    // Find the initial phase questions we just created and update them with answers
    const initialQuestions = incident.questions.filter(
      (q: any) => q.priority?.phase === "initial" && q.generatedBy === "beta-interview-initial"
    )

    for (const savedQuestion of initialQuestions) {
      // Find the corresponding answer by matching question text
      const originalQuestion = questions.find((q: InterviewQuestionInput) => q.text === savedQuestion.questionText)
      if (!originalQuestion) continue

      const answer = answerMap.get(originalQuestion.id)
      if (!answer) continue

      // Update the question with the answer using answerQuestion
      try {
        await answerQuestion(incidentId, savedQuestion.id, {
          id: `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          answerText: answer.text,
          answeredBy: reporterId,
          answeredByName: reporterName,
          answeredAt: answer.answeredAt,
        })
        console.log("[Interview Complete] Updated question with answer:", savedQuestion.id)
      } catch (err) {
        console.error("[Interview Complete] Failed to update answer for question:", savedQuestion.id, err)
      }
    }

    console.log("[Interview Complete] Successfully saved and answered initial interview questions")
  } catch (error) {
    console.error("[Interview Complete] Failed to save initial interview questions:", error)
    // Don't throw - we don't want to fail the incident creation
  }
}

async function generateFollowUpQuestionsAsync(
  incidentId: string,
  reporterId: string,
  reporterName: string,
  currentCompleteness: number
) {
  try {
    console.log("[Interview Complete] Starting background follow-up generation for:", incidentId)
    
    // Use existing investigation agent
    for await (const event of runInvestigationAgent(incidentId)) {
      if (event.type === "questions_generated") {
        console.log("[Interview Complete] Follow-up questions generated:", event.count)
      }
      if (event.type === "error") {
        console.error("[Interview Complete] Investigation error:", event.error)
      }
    }
  } catch (error) {
    console.error("[Interview Complete] Background follow-up generation failed:", error)
  }
}

async function queueFinalCriticalQuestions(
  incidentId: string,
  reporterId: string,
  reporterName: string
) {
  try {
    const questions = FINAL_CRITICAL_QUESTIONS.map((q) => ({
      questionText: q.questionText,
      askedBy: "system",
      askedByName: "WAiK System",
      assignedTo: [reporterId],
      source: "ai-generated" as const,
      generatedBy: "beta-interview-final-critical",
      priority: {
        phase: "final-critical" as const,
        order: q.order,
        isCritical: true,
        goldStandardField: q.goldStandardField,
      },
    }))

    // Queue all final critical questions
    // Note: These won't be visible until other questions are answered
    await queueInvestigationQuestions({
      incidentId,
      askedById: reporterId,
      askedByName: reporterName,
      questions,
      phase: "final-critical",
    })

    console.log("[Interview Complete] Queued", questions.length, "final critical questions")
  } catch (error) {
    console.error("[Interview Complete] Failed to queue final critical questions:", error)
  }
}

