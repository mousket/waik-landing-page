import { NextResponse } from "next/server"
import { getIncidentById, updateIncident } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const incident = await getIncidentById(id)  // ✅ Now async

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("[v0] Error fetching incident:", error)
    return NextResponse.json({ error: "Failed to fetch incident" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const updatedIncident = await updateIncident(id, body)

    if (!updatedIncident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    return NextResponse.json(updatedIncident)
  } catch (error) {
    console.error("[v0] Error updating incident:", error)
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 })
  }
}
