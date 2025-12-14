import { type NextRequest, NextResponse } from "next/server"
import { getIncidentsByStaffId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const staffId = request.nextUrl.searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    const incidents = await getIncidentsByStaffId(staffId)  // ✅ Now awaits!

    // Count unanswered questions across all incidents
    let unansweredCount = 0
    const notifications: Array<{
      incidentId: string
      incidentTitle: string
      questionCount: number
    }> = []

    incidents.forEach((incident) => {
      const unansweredQuestions = incident.questions.filter((q) => !q.answer)
      if (unansweredQuestions.length > 0) {
        unansweredCount += unansweredQuestions.length
        notifications.push({
          incidentId: incident.id,
          incidentTitle: incident.title,
          questionCount: unansweredQuestions.length,
        })
      }
    })

    console.log("[API] Notifications for staff:", staffId, "Count:", unansweredCount)
    return NextResponse.json({ unansweredCount, notifications })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
