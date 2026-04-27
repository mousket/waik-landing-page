import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { BUILTIN_INCIDENT_TYPE_IDS } from "@/lib/facility-builtin-incident-types"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

const KEYS = BUILTIN_INCIDENT_TYPE_IDS

function clamp(n: number): number {
  return Math.min(95, Math.max(60, Math.round(n)))
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
    const thresholds = (body as { thresholds?: Record<string, number> }).thresholds
    if (!thresholds || typeof thresholds !== "object") {
      return NextResponse.json({ error: "thresholds object required" }, { status: 400 })
    }

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const current = (fac.completionThresholds ?? {}) as Record<string, number>
    for (const k of KEYS) {
      const v = thresholds[k as string]
      if (typeof v === "number" && !Number.isNaN(v)) {
        current[k] = clamp(v)
      }
    }
    fac.completionThresholds = current as typeof fac.completionThresholds
    await fac.save()
    return NextResponse.json({ completionThresholds: current })
  } catch (e) {
    return authErrorResponse(e)
  }
}
