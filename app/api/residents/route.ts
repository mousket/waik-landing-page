import { randomInt } from "crypto"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import IncidentModel from "@/backend/src/models/incident.model"
import ResidentModel from "@/backend/src/models/resident.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"
import type { ResidentCareLevel, ResidentStatus } from "@/backend/src/models/resident.model"

const CARE: ResidentCareLevel[] = ["independent", "assisted", "memory_care", "skilled_nursing"]
const ALL_STATUS: Array<"all" | ResidentStatus> = [
  "all",
  "active",
  "inactive",
  "discharged",
  "on-leave",
]

function canPostResident(u: Awaited<ReturnType<typeof getCurrentUser>> | null) {
  if (!u) {
    return false
  }
  return u.isAdminTier || u.canManageResidents
}

function generateResidentId(): string {
  return `res-${Date.now()}-${randomInt(1000, 9999)}`
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }

  const url = new URL(request.url)
  const searchQ = (url.searchParams.get("search") || "").trim().toLowerCase()
  const stParam = (url.searchParams.get("status") || "all").toLowerCase()
  const stFilter: "all" | ResidentStatus = ALL_STATUS.includes(
    stParam as "all" | ResidentStatus,
  )
    ? (stParam as "all" | ResidentStatus)
    : "all"

  try {
    const resolved = await resolveResidentListFacility(request, user)
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId, organizationId } = resolved
    await connectMongo()

    const q: Record<string, unknown> = { facilityId }
    if (stFilter !== "all") {
      q.status = stFilter
    }
    if (searchQ) {
      q.$or = [
        { firstName: new RegExp(escapeRe(searchQ), "i") },
        { lastName: new RegExp(escapeRe(searchQ), "i") },
        { roomNumber: new RegExp(escapeRe(searchQ), "i") },
        { preferredName: new RegExp(escapeRe(searchQ), "i") },
      ]
    }

    const residents = await ResidentModel.find(q)
      .sort({ lastName: 1, firstName: 1 })
      .limit(500)
      .lean()
      .exec()
    type Row = {
      id: string
      firstName: string
      lastName: string
      roomNumber: string
      careLevel: string
      status: string
      admissionDate?: Date
    }
    const rows: Row[] = (residents as unknown as Row[]) ?? []
    if (rows.length === 0) {
      return NextResponse.json({ organizationId, residents: [], total: 0 })
    }
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const ids = rows.map((r) => r.id)
    const [cntAgg, lastA, minNext] = await Promise.all([
      IncidentModel.aggregate([
        { $match: { facilityId, residentId: { $in: ids }, createdAt: { $gte: since } } },
        { $group: { _id: "$residentId", c: { $sum: 1 } } },
      ]),
      AssessmentModel.aggregate([
        { $match: { facilityId, residentId: { $in: ids } } },
        { $group: { _id: "$residentId", last: { $max: "$conductedAt" } } },
      ]),
      AssessmentModel.aggregate([
        { $match: { facilityId, residentId: { $in: ids }, nextDueAt: { $ne: null, $exists: true } } },
        { $group: { _id: "$residentId", n: { $min: "$nextDueAt" } } },
      ]),
    ])
    const cMap = new Map<string, number>(cntAgg.map((x) => [String((x as { _id: string })._id), (x as { c: number }).c]))
    const aMap = new Map<string, Date | null>(lastA.map((x) => [String((x as { _id: string })._id), (x as { last: Date | null }).last ?? null]))
    const nMap = new Map<string, Date | null>(minNext.map((x) => [String((x as { _id: string })._id), (x as { n: Date | null }).n ?? null]))
    return NextResponse.json({
      organizationId,
      residents: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        roomNumber: r.roomNumber,
        careLevel: r.careLevel,
        status: r.status,
        admissionDate: r.admissionDate ? new Date(r.admissionDate).toISOString() : null,
        incidents30d: cMap.get(r.id) ?? 0,
        lastAssessmentAt: aMap.get(r.id) != null
          ? new Date(aMap.get(r.id) as Date).toISOString()
          : null,
        nextDueAt: nMap.get(r.id) != null ? new Date(nMap.get(r.id) as Date).toISOString() : null,
      })),
      total: rows.length,
    })
  } catch (e) {
    return authErrorResponse(e)
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  if (!canPostResident(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
  const roomNumber = typeof body.roomNumber === "string" ? body.roomNumber.trim() : ""
  const careLevel = typeof body.careLevel === "string" ? body.careLevel.trim() : ""
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 })
  }
  if (!careLevel || !CARE.includes(careLevel as ResidentCareLevel)) {
    return NextResponse.json({ error: "Invalid careLevel" }, { status: 400 })
  }

  try {
    const resolved = await resolveResidentListFacility(request, user, {
      facilityId: typeof body.facilityId === "string" ? body.facilityId : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
    })
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId, organizationId } = resolved
    const preferredName = typeof body.preferredName === "string" ? body.preferredName.trim() : undefined
    const wing = typeof body.wing === "string" ? body.wing : undefined
    const gender = body.gender as "male" | "female" | "other" | "prefer_not_to_say" | undefined

    await connectMongo()
    const doc = await ResidentModel.create({
      id: generateResidentId(),
      facilityId,
      organizationId,
      orgId: organizationId,
      firstName,
      lastName,
      preferredName: preferredName || undefined,
      roomNumber,
      wing: wing || undefined,
      careLevel: careLevel as ResidentCareLevel,
      status: "active",
      ...(gender && ["male", "female", "other", "prefer_not_to_say"].includes(gender) ? { gender } : {}),
    })

    return NextResponse.json({
      resident: doc.toObject(),
    }, { status: 201 })
  } catch (e) {
    return authErrorResponse(e)
  }
}
