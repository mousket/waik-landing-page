import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { facilityIdForIncidentMutation, getIncidentForUser, updateIncident } from "@/lib/db"
import type { HumanReport } from "@/lib/types"

/**
 * Create or update human report for an incident
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const { id } = await params
    const body = await request.json()
    const { summary, insights, recommendations, actions, userId } = body

    if (!summary || !insights || !recommendations || !actions || !userId) {
      return NextResponse.json({ error: "All report fields and userId are required" }, { status: 400 })
    }

    const scope = await getIncidentForUser(id, sessionUser)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const incident = scope.incident
    const facilityId = facilityIdForIncidentMutation(incident, sessionUser)
    if (!facilityId) {
      return NextResponse.json({ error: "Incident has no facility" }, { status: 400 })
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
    await updateIncident(id, facilityId, { humanReport })

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
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params
    const scope = await getIncidentForUser(id, user)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const incident = scope.incident

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
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params
    const scope = await getIncidentForUser(id, user)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }
    const incident = scope.incident
    const facilityId = facilityIdForIncidentMutation(incident, user)
    if (!facilityId) {
      return NextResponse.json({ error: "Incident has no facility" }, { status: 400 })
    }

    // Remove human report
    await updateIncident(id, facilityId, { humanReport: undefined })

    console.log("[API] Human report deleted for incident:", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error deleting human report:", error)
    return NextResponse.json({ error: "Failed to delete human report" }, { status: 500 })
  }
}

