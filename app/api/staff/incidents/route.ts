import { type NextRequest, NextResponse } from "next/server"
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { getIncidentsByStaffId } from "@/lib/db"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  try {
    const staffId = request.nextUrl.searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    if (staffId !== user.clerkUserId && !user.isWaikSuperAdmin) {
      return forbiddenResponse()
    }

    const incidents = await getIncidentsByStaffId(staffId, user.facilityId ?? "")
    console.log("[API] Fetched", incidents.length, "incidents for staff:", staffId)
    return NextResponse.json({ incidents })
  } catch (error) {
    console.error("[v0] Error fetching staff incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}
