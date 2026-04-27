import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

function facilityJson(doc: Record<string, unknown>) {
  return {
    id: String(doc.id ?? ""),
    organizationId: String(doc.organizationId ?? ""),
    name: String(doc.name ?? ""),
    type: doc.type,
    state: String(doc.state ?? ""),
    bedCount: doc.bedCount,
    primaryContact: doc.primaryContact,
    reportingConfig: doc.reportingConfig,
    phaseMode: doc.phaseMode,
    completionThresholds: doc.completionThresholds,
    notificationPreferences: doc.notificationPreferences ?? {},
    plan: doc.plan,
    onboardingDate: doc.onboardingDate
      ? new Date(doc.onboardingDate as string | Date).toISOString()
      : null,
    units: doc.units ?? [],
    goldStandardCustom: doc.goldStandardCustom ?? null,
    incidentTypeSettings: doc.incidentTypeSettings ?? null,
  }
}

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
    if (!fac || Array.isArray(fac)) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }
    return NextResponse.json({ facility: facilityJson(fac as unknown as Record<string, unknown>) })
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
    const b = body as Record<string, unknown>

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    if (typeof b.name === "string" && b.name.trim()) {
      fac.name = b.name.trim()
    }
    if (b.type && typeof b.type === "string") {
      fac.type = b.type as typeof fac.type
    }
    if (typeof b.state === "string" && b.state.length === 2) {
      fac.state = b.state.toUpperCase()
    }
    if (b.bedCount != null) {
      const n = Number(b.bedCount)
      if (!Number.isNaN(n) && n >= 0) fac.bedCount = n
    }
    if (b.primaryContact && typeof b.primaryContact === "object" && b.primaryContact !== null) {
      const p = b.primaryContact as { name?: string; email?: string; phone?: string }
      fac.primaryContact = {
        name: p.name ?? fac.primaryContact?.name ?? "",
        email: p.email ?? fac.primaryContact?.email ?? "",
        phone: p.phone ?? fac.primaryContact?.phone ?? "",
      }
    }
    if (b.reportingConfig && typeof b.reportingConfig === "object" && b.reportingConfig !== null) {
      const h = (b.reportingConfig as { mandatedReportingWindowHours?: number }).mandatedReportingWindowHours
      if (typeof h === "number" && h >= 1 && h <= 72) {
        fac.reportingConfig = {
          ...fac.reportingConfig,
          mandatedReportingWindowHours: h,
        }
      }
    }
    if (b.phaseMode === "one_phase" || b.phaseMode === "two_phase") {
      fac.phaseMode = b.phaseMode
    }

    await fac.save()
    const lean = fac.toObject()
    return NextResponse.json({ facility: facilityJson(lean as unknown as Record<string, unknown>) })
  } catch (e) {
    return authErrorResponse(e)
  }
}
