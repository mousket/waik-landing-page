import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import type { CustomIncidentTypeDef } from "@/backend/src/models/facility.model"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

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
    const b = body as { customTypes?: CustomIncidentTypeDef[] }
    if (!Array.isArray(b.customTypes)) {
      return NextResponse.json({ error: "customTypes array required" }, { status: 400 })
    }

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const cleaned: CustomIncidentTypeDef[] = b.customTypes.map((t) => ({
      id: t.id && t.id.length ? t.id : `ct-${randomUUID()}`,
      name: String(t.name || "").trim() || "Unnamed",
      description: String(t.description ?? "").trim(),
      active: t.active !== false,
    }))

    fac.incidentTypeSettings = { customTypes: cleaned }
    await fac.save()
    return NextResponse.json({ customTypes: cleaned })
  } catch (e) {
    return authErrorResponse(e)
  }
}
