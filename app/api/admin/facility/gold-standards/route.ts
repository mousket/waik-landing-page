import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { isBuiltinIncidentId } from "@/lib/notification-prefs"
import { getBuiltinGoldStandardItems } from "@/lib/gold-standards-builtin"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel, { type GoldCustomField } from "@/backend/src/models/facility.model"
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
    const url = new URL(request.url)
    const incidentType = (url.searchParams.get("incidentType") ?? "").trim()
    if (!incidentType) {
      return NextResponse.json({ error: "incidentType query required" }, { status: 400 })
    }
    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).lean().exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const gold = (fac as { goldStandardCustom?: unknown }).goldStandardCustom as
      | Record<string, { customFields?: GoldCustomField[] }>
      | null
      | undefined
    const custom = (gold && gold[incidentType]?.customFields) || []
    const defaultFields = isBuiltinIncidentId(incidentType) ? getBuiltinGoldStandardItems(incidentType) : []
    return NextResponse.json({ defaultFields, customFields: custom })
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
    const b = body as { incidentType?: string; customFields?: GoldCustomField[] }
    if (!b.incidentType) {
      return NextResponse.json({ error: "incidentType required" }, { status: 400 })
    }
    if (!Array.isArray(b.customFields)) {
      return NextResponse.json({ error: "customFields array required" }, { status: 400 })
    }
    for (const f of b.customFields) {
      if (!f || typeof f.name !== "string" || !f.id) {
        return NextResponse.json({ error: "Invalid custom field" }, { status: 400 })
      }
      f.type = f.type ?? "text"
    }

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const g = (fac.goldStandardCustom as Record<string, { customFields: GoldCustomField[] }> | null) ?? {}
    g[b.incidentType] = {
      customFields: b.customFields.map((c) => ({
        id: c.id || `cf-${randomUUID()}`,
        name: c.name,
        type: c.type,
        required: Boolean(c.required),
      })),
    }
    fac.goldStandardCustom = g
    await fac.save()
    return NextResponse.json({ success: true })
  } catch (e) {
    return authErrorResponse(e)
  }
}
