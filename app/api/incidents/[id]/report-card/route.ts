import { NextResponse } from "next/server"

import { getIncidentById } from "@/lib/db"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { buildInitialNarrative } from "@/lib/utils/incident-narrative"

/**
 * Report Card API - STATIC
 * 
 * This returns the report card score based ONLY on the INITIAL NARRATIVE
 * (what the frontline staff reported). This score does NOT change when
 * follow-up questions are answered.
 * 
 * For the dynamic Documentation Score that improves with answers,
 * see /api/incidents/[id]/score endpoint.
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const incident = await getIncidentById(params.id)

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Check if we have cached report card values in the investigation metadata
    const investigation = (incident as any).investigation
    if (investigation?.score !== undefined && investigation?.score !== null) {
      // Return cached static values
      return NextResponse.json(
        {
          score: investigation.score,
          completenessScore: investigation.completenessScore || 0,
          feedback: investigation.feedback || "Report card based on initial narrative.",
          strengths: investigation.strengths || [],
          gaps: investigation.gaps || [],
          isStatic: true,
        },
        { status: 200 },
      )
    }

    // If not cached, calculate from INITIAL NARRATIVE ONLY (no Q&A)
    const initialNarrative = buildInitialNarrative(incident)

    if (!initialNarrative) {
      return NextResponse.json(
        {
          score: 0,
          completenessScore: 0,
          feedback: "No narrative recorded yet.",
          strengths: [],
          gaps: [],
          isStatic: true,
        },
        { status: 200 },
      )
    }

    // Analyze only the initial narrative (static - reflects initial report quality)
    const analysis = await analyzeNarrativeAndScore(initialNarrative)

    return NextResponse.json(
      {
        score: analysis.score,
        completenessScore: analysis.completenessScore,
        feedback: analysis.feedback,
        strengths: analysis.filledFields,
        gaps: analysis.missingFields,
        isStatic: true,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[incident-report-card] GET error", error)
    return NextResponse.json({ error: "Failed to compute report card" }, { status: 500 })
  }
}
