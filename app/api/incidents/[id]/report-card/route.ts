import { NextResponse } from "next/server"

import { getIncidentById } from "@/lib/db"
import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"
import { buildIncidentCombinedNarrative } from "@/lib/utils/incident-narrative"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const incident = await getIncidentById(params.id)

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    const combinedNarrative = buildIncidentCombinedNarrative(incident)

    if (!combinedNarrative) {
      return NextResponse.json(
        {
          score: 0,
          completenessScore: 0,
          feedback: "No narrative or answers recorded yet.",
          strengths: [],
          gaps: [],
        },
        { status: 200 },
      )
    }

    const analysis = await analyzeNarrativeAndScore(combinedNarrative)

    return NextResponse.json(
      {
        score: analysis.score,
        completenessScore: analysis.completenessScore,
        feedback: analysis.feedback,
        strengths: analysis.filledFields,
        gaps: analysis.missingFields,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[incident-report-card] GET error", error)
    return NextResponse.json({ error: "Failed to compute report card" }, { status: 500 })
  }
}
