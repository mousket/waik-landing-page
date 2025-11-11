import { type NextRequest, NextResponse } from "next/server"
import { getIncidentsByStaffId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const staffId = request.nextUrl.searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    const incidents = await getIncidentsByStaffId(staffId)  
    console.log("[API] Fetched", incidents.length, "incidents for staff:", staffId)
    return NextResponse.json({ incidents })
  } catch (error) {
    console.error("[v0] Error fetching staff incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}
