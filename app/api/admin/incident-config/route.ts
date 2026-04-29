import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel, { type GoldCustomField } from "@/backend/src/models/facility.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"
import {
  BUILTIN_INCIDENT_TYPE_IDS,
  type BuiltinIncidentTypeId,
} from "@/lib/facility-builtin-incident-types"
import { getBuiltinGoldStandardItems } from "@/lib/gold-standards-builtin"
import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"

/**
 * IR-2f — Tier 1 question / incident-type configuration API.
 *
 * GET  /api/admin/incident-config?incidentType=fall
 *   Returns the Tier 1 questions, closing questions, gold-standard fields
 *   (built-in + facility custom), and the facility's completion threshold
 *   for the given incident type.
 *
 * PATCH /api/admin/incident-config
 *   Body: { incidentType: string, completionThreshold: number }
 *   Updates only the facility's completion threshold for that incident type.
 *   Tier 1 question customization is deferred to post-pilot.
 */

const DEFAULT_THRESHOLDS: Record<BuiltinIncidentTypeId, number> = {
  fall: 75,
  medication_error: 80,
  resident_conflict: 70,
  wound_injury: 80,
  abuse_neglect: 90,
}

function isBuiltin(t: string): t is BuiltinIncidentTypeId {
  return (BUILTIN_INCIDENT_TYPE_IDS as readonly string[]).includes(t)
}

function clampThreshold(n: number): number {
  return Math.min(95, Math.max(60, Math.round(n)))
}

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
      return NextResponse.json({ error: "incidentType query parameter required" }, { status: 400 })
    }

    const tier1Questions = TIER1_BY_TYPE[incidentType] ?? []
    const closingQuestions = CLOSING_QUESTIONS

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    const defaultFields = isBuiltin(incidentType) ? getBuiltinGoldStandardItems(incidentType) : []
    const customFields: GoldCustomField[] =
      fac.goldStandardCustom?.[incidentType]?.customFields ?? []

    const thresholdsMap = (fac.completionThresholds ?? {}) as Record<string, number>
    const completionThreshold = isBuiltin(incidentType)
      ? thresholdsMap[incidentType] ?? DEFAULT_THRESHOLDS[incidentType]
      : thresholdsMap[incidentType] ?? 75

    return NextResponse.json({
      incidentType,
      tier1Questions,
      closingQuestions,
      goldStandardFields: {
        defaultFields,
        customFields,
      },
      completionThreshold,
    })
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

    const incidentType = (body as { incidentType?: unknown }).incidentType
    const completionThreshold = (body as { completionThreshold?: unknown }).completionThreshold

    if (typeof incidentType !== "string" || !incidentType.trim()) {
      return NextResponse.json({ error: "incidentType required" }, { status: 400 })
    }
    if (!isBuiltin(incidentType)) {
      return NextResponse.json(
        { error: "completionThreshold edits are only supported for built-in incident types" },
        { status: 400 },
      )
    }
    if (typeof completionThreshold !== "number" || Number.isNaN(completionThreshold)) {
      return NextResponse.json({ error: "completionThreshold must be a number" }, { status: 400 })
    }

    await connectMongo()
    const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
    if (!fac) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 })
    }

    const current = (fac.completionThresholds ?? {}) as Record<string, number>
    current[incidentType] = clampThreshold(completionThreshold)
    fac.completionThresholds = current as typeof fac.completionThresholds
    await fac.save()

    return NextResponse.json({ success: true })
  } catch (e) {
    return authErrorResponse(e)
  }
}
