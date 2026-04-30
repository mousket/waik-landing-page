import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { withAdminAuth } from "@/lib/api-handler"
import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"
import { BUILTIN_INCIDENT_TYPE_IDS } from "@/lib/facility-builtin-incident-types"
import { getBuiltinGoldStandardItems } from "@/lib/gold-standards-builtin"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

function clampThreshold(n: number): number {
  return Math.min(95, Math.max(60, Math.round(n)))
}

function normalizeIncidentType(raw: string): string {
  return raw.trim().toLowerCase()
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

export const GET = withAdminAuth(async (request, { currentUser }) => {
  const { searchParams } = new URL(request.url)
  const incidentTypeRaw = searchParams.get("incidentType") ?? ""
  const incidentType = normalizeIncidentType(incidentTypeRaw)
  if (!incidentType) {
    return NextResponse.json({ error: "incidentType is required" }, { status: 400 })
  }

  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  const tier1Questions = TIER1_BY_TYPE[incidentType] ?? []
  const closingQuestions = CLOSING_QUESTIONS

  await connectMongo()
  const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).lean().exec()
  if (!fac || Array.isArray(fac)) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 })
  }

  const thresholds = (fac as { completionThresholds?: Record<string, number> }).completionThresholds ?? {}
  const completionThreshold = typeof thresholds[incidentType] === "number" ? thresholds[incidentType] : 75

  const builtin = getBuiltinGoldStandardItems(incidentType)
  const custom =
    (fac as { goldStandardCustom?: Record<string, { customFields?: unknown }> | null }).goldStandardCustom?.[
      incidentType
    ]?.customFields ?? []

  return NextResponse.json(
    {
      incidentType,
      tier1Questions,
      closingQuestions,
      goldStandardFields: {
        defaultFields: builtin,
        customFields: Array.isArray(custom) ? custom : [],
      },
      completionThreshold,
      supportedIncidentTypes: [...BUILTIN_INCIDENT_TYPE_IDS],
    },
    { status: 200 },
  )
})

export const PATCH = withAdminAuth(async (request, { currentUser }) => {
  const resolved = await resolveEffectiveAdminFacility(request, currentUser)
  if (isEffectiveAdminFacilityError(resolved)) return resolved.error
  const { facilityId } = resolved

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const incidentTypeRaw = (body as { incidentType?: unknown }).incidentType
  const incidentType = typeof incidentTypeRaw === "string" ? normalizeIncidentType(incidentTypeRaw) : ""
  if (!incidentType) {
    return NextResponse.json({ error: "incidentType is required" }, { status: 400 })
  }
  if (!(BUILTIN_INCIDENT_TYPE_IDS as readonly string[]).includes(incidentType)) {
    return NextResponse.json({ error: "Unsupported incidentType" }, { status: 400 })
  }

  const completionThresholdRaw = (body as { completionThreshold?: unknown }).completionThreshold
  if (typeof completionThresholdRaw !== "number" || Number.isNaN(completionThresholdRaw)) {
    return NextResponse.json({ error: "completionThreshold (number) is required" }, { status: 400 })
  }
  const completionThreshold = clampThreshold(completionThresholdRaw)

  await connectMongo()
  const fac = await FacilityModel.findOne({ id: facilityId, isActive: true }).exec()
  if (!fac) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 })
  }

  const current = (fac.completionThresholds ?? {}) as Record<string, number>
  current[incidentType] = completionThreshold
  fac.completionThresholds = current as typeof fac.completionThresholds
  await fac.save()

  return NextResponse.json({ success: true, incidentType, completionThreshold }, { status: 200 })
})

