import { NextResponse } from "next/server"
import { getIncidents } from "@/lib/db"

export async function GET() {
  try {
    const incidents = getIncidents()
    return NextResponse.json(incidents)
  } catch (error) {
    console.error("[v0] Error fetching incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}
