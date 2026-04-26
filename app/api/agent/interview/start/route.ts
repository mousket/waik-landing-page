import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { detectIncidentCategory, detectFallSubtype } from "@/lib/agents/category_detector"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { generateGapQuestions } from "@/lib/agents/expert_investigator/gap_questions"
import {
  createInterviewWorkSession,
  type InterviewWorkSession,
} from "@/lib/interview_work_session_store"
import { isOpenAIConfigured } from "@/lib/openai"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const body = await request.json()
    const { residentName, roomNumber, narrative, reportedById, reportedByName } = body

    if (!narrative) {
      return NextResponse.json({ error: "Narrative is required" }, { status: 400 })
    }

    console.log("[Interview Start] Analyzing narrative for:", residentName)

    // Step 1: Detect incident category
    const categoryResult = await detectIncidentCategory(narrative)
    console.log("[Interview Start] Category detected:", categoryResult)

    // Step 2: Get subtype if it's a fall
    let subtype: string | null = null
    if (categoryResult.category === "fall") {
      subtype = categoryResult.suggestedSubtype || (await detectFallSubtype(narrative))
    }

    // Step 3: Analyze narrative against gold standard (for falls)
    let completenessScore = 0
    let questions: Array<{
      id: string
      text: string
      phase: "initial" | "follow-up" | "final-critical"
      goldStandardField?: string
      isCritical: boolean
    }> = []

    if (categoryResult.category === "fall" && isOpenAIConfigured()) {
      // Use existing fall analysis infrastructure
      const analysisResult = await analyzeNarrativeAndScore(narrative)
      completenessScore = analysisResult.completenessScore

      // Generate gap questions for initial interview (5-8 questions)
      const gapResult = await generateGapQuestions(analysisResult.state, {
        responderName: reportedByName,
        subtypeLabel: subtype?.replace("fall-", "") || undefined,
        maxQuestions: 8,
      })

      // Transform to our question format
      questions = gapResult.questions.slice(0, 8).map((text, index) => ({
        id: `initial-${Date.now()}-${index}`,
        text,
        phase: "initial" as const,
        goldStandardField: gapResult.missingFields[index]?.key,
        isCritical: false,
      }))

      console.log("[Interview Start] Generated", questions.length, "initial questions")
    } else {
      // Fallback questions for non-falls or when OpenAI is not configured
      questions = getFallbackQuestions(categoryResult.category)
    }

    // Ensure we have at least 5 questions
    if (questions.length < 5) {
      const additionalQuestions = getAdditionalQuestions(categoryResult.category, 5 - questions.length)
      questions = [...questions, ...additionalQuestions]
    }

    const sessionId = randomUUID()
    const workSession: InterviewWorkSession = {
      id: sessionId,
      userId: user.userId,
      facilityId: user.facilityId ?? "",
      residentName: typeof residentName === "string" ? residentName : undefined,
      roomNumber: typeof roomNumber === "string" ? roomNumber : undefined,
      narrative: typeof narrative === "string" ? narrative : "",
      reportedById: typeof reportedById === "string" ? reportedById : user.userId,
      reportedByName: typeof reportedByName === "string" ? reportedByName : undefined,
      category: categoryResult.category,
      subtype: subtype ?? null,
      completenessScore,
      questions,
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await createInterviewWorkSession(workSession)

    return NextResponse.json({
      sessionId,
      category: categoryResult.category,
      categoryConfidence: categoryResult.confidence,
      subtype,
      completenessScore,
      questions,
      reasoning: categoryResult.reasoning,
    })
  } catch (error) {
    console.error("[Interview Start] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start interview" },
      { status: 500 }
    )
  }
}

function getFallbackQuestions(category: string): Array<{
  id: string
  text: string
  phase: "initial"
  isCritical: boolean
}> {
  const baseQuestions = [
    "What time did this incident occur?",
    "Who was present when this happened?",
    "What was the resident doing just before the incident?",
    "Were there any visible injuries?",
    "What immediate actions were taken?",
  ]

  const categorySpecific: Record<string, string[]> = {
    fall: [
      "Where exactly did the fall occur?",
      "Was the resident using any assistive device?",
      "What was the resident wearing on their feet?",
    ],
    medication: [
      "What medication was involved?",
      "What was the prescribed dose vs. administered dose?",
      "Was the physician notified?",
    ],
    dietary: [
      "What food or drink was involved?",
      "What is the resident's prescribed diet?",
      "Were there any allergic reactions?",
    ],
    behavioral: [
      "What triggered the behavior?",
      "Were any de-escalation techniques used?",
      "Were other residents or staff affected?",
    ],
  }

  const specific = categorySpecific[category] || []

  return [...baseQuestions, ...specific].map((text, index) => ({
    id: `fallback-${Date.now()}-${index}`,
    text,
    phase: "initial" as const,
    isCritical: false,
  }))
}

function getAdditionalQuestions(
  category: string,
  count: number
): Array<{
  id: string
  text: string
  phase: "initial"
  isCritical: boolean
}> {
  const additionalPool = [
    "Can you describe the environment at the time of the incident?",
    "Has this type of incident occurred with this resident before?",
    "Were there any warning signs before the incident?",
    "Is there anything about the resident's recent health changes we should know?",
    "Who else should be notified about this incident?",
  ]

  return additionalPool.slice(0, count).map((text, index) => ({
    id: `additional-${Date.now()}-${index}`,
    text,
    phase: "initial" as const,
    isCritical: false,
  }))
}

