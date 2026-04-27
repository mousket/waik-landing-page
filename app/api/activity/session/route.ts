import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ActivityLogModel from "@/backend/src/models/activity-log.model"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
const DEDUPE_HOURS = 8

/**
 * Idempotent "login" activity (call from client on shell mount). Deduplicated per user in a window.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (!user.facilityId) {
    return NextResponse.json({ error: "No facility" }, { status: 400 })
  }

  try {
    await connectMongo()
    const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000)
    const recent = await ActivityLogModel.findOne({
      userId: user.userId,
      action: "login",
      createdAt: { $gte: since },
    })
      .lean()
      .exec()
    if (recent) {
      return NextResponse.json({ ok: true, logged: false })
    }

    logActivity({
      userId: user.userId,
      userName: actorNameFromUser(user),
      role: user.roleSlug,
      facilityId: user.facilityId,
      action: "login",
      req: request,
    })

    return NextResponse.json({ ok: true, logged: true })
  } catch (e) {
    console.error("[activity/session]", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
