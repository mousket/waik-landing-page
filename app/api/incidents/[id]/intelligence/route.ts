import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { getIncidentForUser } from "@/lib/db"
import { getIntelligenceQA } from "@/lib/agents/intelligence-qa"
import { isOpenAIConfigured } from "@/lib/openai"

/**
 * Ask a question about an incident using AI intelligence (RAG)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const { id } = await params
    const body = await request.json()
    const { question, userId, useTools = true } = body  // ✅ Accept userId and useTools flag

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Set OPENAI_API_KEY environment variable." },
        { status: 503 },
      )
    }

    const scope = await getIncidentForUser(id, sessionUser)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const incident = scope.incident

    const qaAgent = getIntelligenceQA()
    let answer: string

    // Use AGENTIC mode (with tools) if userId provided
    if (useTools && userId) {
      console.log("[API] Using AGENTIC Intelligence (can send questions to staff)")
      answer = await qaAgent.answerQuestionWithTools(incident, question, userId)
    } else {
      console.log("[API] Using standard Intelligence (RAG only)")
      answer = await qaAgent.answerQuestion(incident, question)
    }

    console.log("[API] Intelligence answer generated")
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

