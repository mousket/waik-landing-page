import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { type MergedNotificationPrefs, mergeNotificationPreferences } from "@/lib/notification-prefs"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)
    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).lean().exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const n = (fac as { notificationPreferences?: Record<string, unknown> }).notificationPreferences
    return NextResponse.json(mergeNotificationPreferences(n))
  } catch (e) {
    return authErrorResponse(e)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)
    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const prefs = body as MergedNotificationPrefs
    if (!prefs || typeof prefs !== "object") {
      return NextResponse.json({ error: "body required" }, { status: 400 })
    }

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    fac.set("notificationPreferences", prefs)
    await fac.save()
    return NextResponse.json(mergeNotificationPreferences(fac.get("notificationPreferences") as Record<string, unknown>))
  } catch (e) {
    return authErrorResponse(e)
  }
}
