import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { fillGapsWithAnswer } from "@/lib/agents/expert_investigator/fill_gaps"
import { isOpenAIConfigured } from "@/lib/openai"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const body = await request.json()
    const { questionId, answer, narrative, previousAnswers, category, subtype } = body

    if (!questionId || !answer) {
      return NextResponse.json({ error: "Question ID and answer are required" }, { status: 400 })
    }

    console.log("[Interview Answer] Processing answer for question:", questionId)

    // Build combined narrative from original + all answers
    const combinedNarrative = buildCombinedNarrative(narrative, previousAnswers, answer)

    let completenessScore = 0
    let updatedFields: string[] = []

    if (category === "fall" && isOpenAIConfigured()) {
      // Re-analyze with combined information
      const analysisResult = await analyzeNarrativeAndScore(combinedNarrative)
      completenessScore = analysisResult.completenessScore
      updatedFields = analysisResult.filledFields

      console.log("[Interview Answer] Updated completeness:", completenessScore, "%")
    } else {
      // Estimate completeness based on answers provided
      const totalAnswers = (previousAnswers?.length || 0) + 1
      completenessScore = Math.min(95, 30 + totalAnswers * 10)
    }

    return NextResponse.json({
      success: true,
      completenessScore,
      updatedFields,
      shouldComplete: completenessScore >= 70,
    })
  } catch (error) {
    console.error("[Interview Answer] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process answer" },
      { status: 500 }
    )
  }
}

function buildCombinedNarrative(
  originalNarrative: string,
  previousAnswers: Array<{ text: string }> | undefined,
  currentAnswer: string
): string {
  const parts = [originalNarrative]

  if (previousAnswers && previousAnswers.length > 0) {
    parts.push("\n\nAdditional Information:")
    previousAnswers.forEach((a, i) => {
      parts.push(`${i + 1}. ${a.text}`)
    })
  }

  parts.push(`\nLatest Response: ${currentAnswer}`)

  return parts.join("\n")
}

