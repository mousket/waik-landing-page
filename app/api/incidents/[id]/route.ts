import { NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { getIncidentForUser, updateIncident } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params
    const result = await getIncidentForUser(id, user)
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (result.kind === "forbidden") {
      return forbiddenResponse()
    }

    return NextResponse.json(result.incident)
  } catch (error) {
    console.error("[v0] Error fetching incident:", error)
    return NextResponse.json({ error: "Failed to fetch incident" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params
    const body = await request.json()

    if (!user.facilityId && !user.isWaikSuperAdmin) {
      return NextResponse.json({ error: "No facility assigned to user" }, { status: 400 })
    }

    const scope = await getIncidentForUser(id, user)
    if (scope.kind === "not_found") {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    if (scope.kind === "forbidden") {
      return forbiddenResponse()
    }

    const facilityId = scope.incident.facilityId ?? user.facilityId
    if (!facilityId) {
      return NextResponse.json({ error: "Incident has no facility" }, { status: 400 })
    }

    const updatedIncident = await updateIncident(id, facilityId, body)

    if (!updatedIncident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    return NextResponse.json(updatedIncident)
  } catch (error) {
    console.error("[v0] Error updating incident:", error)
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 })
  }
}
