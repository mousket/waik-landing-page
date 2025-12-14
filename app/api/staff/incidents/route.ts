import { type NextRequest, NextResponse } from "next/server"
import { getIncidentsByStaffId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const staffId = request.nextUrl.searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    console.log("[v0] [API] Fetching incidents for staff:", staffId)
    const incidents = getIncidentsByStaffId(staffId)
    console.log("[v0] [API] ✅ Fetched", incidents.length, "incidents for staff", staffId)
    console.log("[v0] [API] Incident IDs:", incidents.map((i) => i.id).join(", "))

    return NextResponse.json({ incidents })
  } catch (error) {
    console.error("[v0] Error fetching staff incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}
