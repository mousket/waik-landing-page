import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import {
  getInterviewWorkSession,
  type InterviewWorkAnswer,
  updateInterviewWorkSession,
} from "@/lib/interview_work_session_store"
import { isOpenAIConfigured } from "@/lib/openai"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const body = await request.json() as {
      sessionId?: string
      questionId: string
      answer: string
      narrative?: string
      previousAnswers?: Array<{
        questionId: string
        questionText?: string
        text: string
        answeredAt: string
        method?: "voice" | "text"
      }>
      category?: string
      subtype?: string | null
    }
    const { questionId, answer, sessionId, narrative, previousAnswers, category, subtype } = body

    if (!questionId || !answer) {
      return NextResponse.json({ error: "Question ID and answer are required" }, { status: 400 })
    }

    let work = sessionId ? await getInterviewWorkSession(sessionId) : undefined
    if (sessionId) {
      if (!work) {
        return NextResponse.json(
          { error: "Session not found or expired. Please start a new report." },
          { status: 404 },
        )
      }
      if (work.userId !== user.userId) {
        return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
      }
    }

    const narrativeText = narrative ?? work?.narrative ?? ""
    const categoryUsed = category ?? work?.category
    const subtypeUsed = subtype !== undefined ? subtype : work?.subtype ?? null

    const previousForCombine: Array<{ text: string }> | undefined =
      previousAnswers && previousAnswers.length > 0
        ? previousAnswers.map((a) => ({ text: a.text }))
        : work?.answers.length
          ? work.answers.map((a) => ({ text: a.text }))
          : undefined

    const combinedNarrative = buildCombinedNarrative(narrativeText, previousForCombine, answer)

    let completenessScore = 0
    let updatedFields: string[] = []

    if (categoryUsed === "fall" && isOpenAIConfigured()) {
      const analysisResult = await analyzeNarrativeAndScore(combinedNarrative)
      completenessScore = analysisResult.completenessScore
      updatedFields = analysisResult.filledFields

      console.log("[Interview Answer] Updated completeness:", completenessScore, "%")
    } else {
      const totalAnswers = (previousForCombine?.length ?? 0) + 1
      completenessScore = Math.min(95, 30 + totalAnswers * 10)
    }

    if (sessionId && work) {
      let nextAnswers: InterviewWorkAnswer[]
      if (previousAnswers && previousAnswers.length > 0) {
        nextAnswers = previousAnswers.map((a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          text: a.text,
          answeredAt: a.answeredAt,
          method: a.method,
        }))
      } else {
        nextAnswers = mergeOneAnswer(work.answers, {
          questionId,
          text: answer,
          answeredAt: new Date().toISOString(),
          method: "text",
        })
      }
      await updateInterviewWorkSession(sessionId, (s) => ({
        ...s,
        answers: nextAnswers,
        completenessScore,
        category: categoryUsed ?? s.category,
        subtype: subtypeUsed,
      }))
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
      { status: 500 },
    )
  }
}

function mergeOneAnswer(
  existing: InterviewWorkAnswer[],
  next: InterviewWorkAnswer,
): InterviewWorkAnswer[] {
  const i = existing.findIndex((a) => a.questionId === next.questionId)
  if (i >= 0) {
    const copy = [...existing]
    copy[i] = { ...next, method: next.method ?? copy[i].method }
    return copy
  }
  return [...existing, next]
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
