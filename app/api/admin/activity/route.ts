import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ActivityLogModel, { type ActivityLogAction } from "@/backend/src/models/activity-log.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireAdminTier } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

const ACTIONS: Set<string> = new Set([
  "login",
  "incident_created",
  "phase2_claimed",
  "investigation_closed",
  "user_invited",
  "role_changed",
  "user_deactivated",
  "assessment_completed",
])

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)

    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    const url = request.nextUrl
    const userIdFilter = (url.searchParams.get("userId") ?? "").trim()
    const actionParam = (url.searchParams.get("action") ?? "").trim()
    const action: ActivityLogAction | undefined = ACTIONS.has(actionParam)
      ? (actionParam as ActivityLogAction)
      : undefined

    await connectMongo()
    const q: Record<string, unknown> = { facilityId }
    if (userIdFilter) {
      q.userId = userIdFilter
    }
    if (action) {
      q.action = action
    }

    const entries = await ActivityLogModel.find(q)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec()

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        userName: e.userName,
        role: e.role,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        metadata: e.metadata,
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      })),
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}
