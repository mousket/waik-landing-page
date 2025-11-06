import { NextResponse } from "next/server"
import { getIncidents } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] [API] Fetching all incidents for admin dashboard...")
    const incidents = getIncidents()
    console.log("[v0] [API] ✅ Fetched", incidents.length, "incidents")
    console.log("[v0] [API] Incident IDs:", incidents.map((i) => i.id).join(", "))
    return NextResponse.json(incidents)
  } catch (error) {
    console.error("[v0] Error fetching incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}
