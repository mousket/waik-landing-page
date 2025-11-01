import { NextResponse } from "next/server"
import { getIncidentById, updateIncident } from "@/lib/db"
import type { HumanReport } from "@/lib/types"

/**
 * Create or update human report for an incident
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { summary, insights, recommendations, actions, userId } = body

    if (!summary || !insights || !recommendations || !actions || !userId) {
      return NextResponse.json({ error: "All report fields and userId are required" }, { status: 400 })
    }

    // Get incident
    const incident = getIncidentById(id)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Create or update human report
    const humanReport: HumanReport = incident.humanReport
      ? {
          // Updating existing report
          summary,
          insights,
          recommendations,
          actions,
          createdBy: incident.humanReport.createdBy,
          createdAt: incident.humanReport.createdAt,
          lastEditedBy: userId,
          lastEditedAt: new Date().toISOString(),
        }
      : {
          // Creating new report
          summary,
          insights,
          recommendations,
          actions,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        }

    // Save to database
    await updateIncident(id, { humanReport })

    console.log("[API] Human report saved for incident:", id)
    return NextResponse.json({ success: true, humanReport })
  } catch (error) {
    console.error("[API] Error saving human report:", error)
    return NextResponse.json({ error: "Failed to save human report" }, { status: 500 })
  }
}

/**
 * Get human report for an incident
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const incident = getIncidentById(id)

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    if (!incident.humanReport) {
      return NextResponse.json({ error: "No human report exists yet" }, { status: 404 })
    }

    return NextResponse.json(incident.humanReport)
  } catch (error) {
    console.error("[API] Error fetching human report:", error)
    return NextResponse.json({ error: "Failed to fetch human report" }, { status: 500 })
  }
}

/**
 * Delete human report
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const incident = getIncidentById(id)

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Remove human report
    await updateIncident(id, { humanReport: undefined })

    console.log("[API] Human report deleted for incident:", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error deleting human report:", error)
    return NextResponse.json({ error: "Failed to delete human report" }, { status: 500 })
  }
}

