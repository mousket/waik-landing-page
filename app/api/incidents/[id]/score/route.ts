import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { getIncidentForUser } from "@/lib/db"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { isOpenAIConfigured } from "@/lib/openai"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const { id } = await params
    const scope = await getIncidentForUser(id, sessionUser)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const incident = scope.incident

    // Calculate basic question stats
    const totalQuestions = incident.questions?.length || 0
    const answeredQuestions = incident.questions?.filter((q) => q.answer)?.length || 0
    const pendingCriticalQuestions = incident.questions?.filter(
      (q) => !q.answer && (q as any).priority?.isCritical
    )?.length || 0

    // Build narrative from all sources
    const narrative = buildFullNarrative(incident)

    let completenessScore = 0
    let filledFields: string[] = []
    let missingFields: string[] = []

    // Try to analyze with gold standard
    if (isOpenAIConfigured() && narrative.length > 50) {
      try {
        const result = await analyzeNarrativeAndScore(narrative)
        completenessScore = result.completenessScore
        filledFields = result.filledFields
        missingFields = result.missingFields
      } catch (error) {
        console.error("[Score API] Analysis failed:", error)
        // Fallback to simple calculation
        completenessScore = calculateSimpleScore(incident, answeredQuestions, totalQuestions)
      }
    } else {
      // Fallback calculation when OpenAI not available
      completenessScore = calculateSimpleScore(incident, answeredQuestions, totalQuestions)
    }

    return NextResponse.json({
      completenessScore,
      filledFields,
      missingFields,
      totalQuestions,
      answeredQuestions,
      pendingCriticalQuestions,
      incidentCategory: detectCategory(incident),
      incidentSubtype: (incident as any).investigation?.subtype || null,
    })
  } catch (error) {
    console.error("[Score API] Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate score" },
      { status: 500 }
    )
  }
}

function buildFullNarrative(incident: any): string {
  const parts: string[] = []

  // Add initial report narrative
  if (incident.initialReport?.narrative) {
    parts.push(incident.initialReport.narrative)
  }

  // Add enhanced narrative
  if (incident.initialReport?.enhancedNarrative) {
    parts.push(incident.initialReport.enhancedNarrative)
  }

  // Add description
  if (incident.description && !parts.some((p) => p.includes(incident.description))) {
    parts.push(incident.description)
  }

  // Add resident state
  if (incident.initialReport?.residentState) {
    parts.push(`Resident State: ${incident.initialReport.residentState}`)
  }

  // Add environment notes
  if (incident.initialReport?.environmentNotes) {
    parts.push(`Environment: ${incident.initialReport.environmentNotes}`)
  }

  // Add answered questions
  const answers = incident.questions
    ?.filter((q: any) => q.answer?.answerText || q.answer?.text)
    .map((q: any) => {
      const answerText = q.answer?.answerText || q.answer?.text
      return `Q: ${q.questionText}\nA: ${answerText}`
    })

  if (answers?.length > 0) {
    parts.push("\n--- Interview Responses ---")
    parts.push(...answers)
  }

  return parts.join("\n\n")
}

function calculateSimpleScore(
  incident: any,
  answeredQuestions: number,
  totalQuestions: number
): number {
  let score = 0

  // Base score from having initial report
  if (incident.initialReport?.narrative) {
    score += 30
  }

  // Score from resident state
  if (incident.initialReport?.residentState) {
    score += 10
  }

  // Score from environment notes
  if (incident.initialReport?.environmentNotes) {
    score += 10
  }

  // Score from questions answered
  if (totalQuestions > 0) {
    const questionScore = (answeredQuestions / totalQuestions) * 40
    score += questionScore
  }

  // Score from having summary
  if (incident.summary) {
    score += 10
  }

  return Math.min(Math.round(score), 100)
}

function detectCategory(incident: any): string {
  // Check if subtype indicates category
  const subtype = (incident as any).investigation?.subtype || ""
  if (subtype.startsWith("fall-")) {
    return "fall"
  }

  // Simple keyword detection from title/description
  const text = `${incident.title || ""} ${incident.description || ""}`.toLowerCase()
  
  if (text.includes("fall") || text.includes("fell") || text.includes("slip")) {
    return "fall"
  }
  if (text.includes("medication") || text.includes("drug") || text.includes("dose")) {
    return "medication"
  }
  if (text.includes("dietary") || text.includes("food") || text.includes("meal")) {
    return "dietary"
  }
  if (text.includes("behavior") || text.includes("aggressive") || text.includes("wander")) {
    return "behavioral"
  }

  return "other"
}

