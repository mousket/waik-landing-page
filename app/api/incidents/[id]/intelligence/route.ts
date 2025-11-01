import { NextResponse } from "next/server"
import { getIncidentById } from "@/lib/db"
import { getIntelligenceQA } from "@/lib/agents/intelligence-qa"
import { isOpenAIConfigured } from "@/lib/openai"

/**
 * Ask a question about an incident using AI intelligence (RAG)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { question } = body

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

    // Get incident
    const incident = getIncidentById(id)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Get answer using Intelligence agent with RAG
    console.log("[API] Processing intelligence question for incident:", id)
    const qaAgent = getIntelligenceQA()
    const answer = await qaAgent.answerQuestion(incident, question)

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

