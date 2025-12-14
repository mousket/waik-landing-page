import { NextResponse } from "next/server"
import { getIncidentById, updateIncident } from "@/lib/db"
import { getIncidentAnalyzer } from "@/lib/agents/incident-analyzer"
import { isOpenAIConfigured } from "@/lib/openai"

/**
 * Generate AI report for an incident
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Set OPENAI_API_KEY environment variable." },
        { status: 503 },
      )
    }

    // Get incident
    const incident = await getIncidentById(id)  // ✅ Now async
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Generate AI report
    console.log("[API] Generating AI report for incident:", id)
    const analyzer = getIncidentAnalyzer()
    const aiReport = await analyzer.generateReport(incident)

    // Save to database
    await updateIncident(id, { aiReport })

    console.log("[API] AI report generated and saved")
    return NextResponse.json({ success: true, aiReport })
  } catch (error) {
    console.error("[API] Error generating AI report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI report" },
      { status: 500 },
    )
  }
}

/**
 * Get AI report for an incident (if it exists)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const incident = await getIncidentById(id)  // ✅ Now async

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    if (!incident.aiReport) {
      return NextResponse.json({ error: "No AI report generated yet" }, { status: 404 })
    }

    return NextResponse.json(incident.aiReport)
  } catch (error) {
    console.error("[API] Error fetching AI report:", error)
    return NextResponse.json({ error: "Failed to fetch AI report" }, { status: 500 })
  }
}
