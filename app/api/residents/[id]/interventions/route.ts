import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import InterventionModel from "@/backend/src/models/intervention.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"
import { isAdminRole } from "@/lib/waik-roles"

export const dynamic = "force-dynamic"

const TYPES = ["temporary", "permanent"] as const
const DEPTS = ["nursing", "dietary", "therapy", "activities", "administration", "multiple"] as const

function sortInt(a: { isActive?: boolean; placedAt?: Date }, b: { isActive?: boolean; placedAt?: Date }): number {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1
  }
  const pa = a.placedAt ? new Date(a.placedAt).getTime() : 0
  const pb = b.placedAt ? new Date(b.placedAt).getTime() : 0
  return pb - pa
}

function canAddIntervention(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): boolean {
  if (isAdminRole(String(user.roleSlug))) {
    return true
  }
  if (user.isAdminTier) {
    return true
  }
  if (user.canAccessPhase2) {
    return true
  }
  if (user.canManageResidents) {
    return true
  }
  return false
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  const { id: residentId } = await params
  try {
    const resolved = await resolveResidentListFacility(request, user)
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId } = resolved
    await connectMongo()
    const r = await ResidentModel.findOne({ id: residentId, facilityId }).lean().exec()
    if (!r) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }
    const rows = await InterventionModel.find({ facilityId, residentId }).lean().exec()
    const list = (rows as Record<string, unknown>[]).sort((x, y) => sortInt(x, y))
    return NextResponse.json({ interventions: list, total: list.length })
  } catch (e) {
    return authErrorResponse(e)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  if (!canAddIntervention(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id: residentId } = await params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const description = String(body.description ?? "").trim()
  const department = String(body.department ?? "").trim()
  const itype = String(body.type ?? "temporary")
  const start = body.startDate as string | undefined
  if (!description || !department) {
    return NextResponse.json({ error: "description and department are required" }, { status: 400 })
  }
  if (!DEPTS.includes(department as (typeof DEPTS)[number])) {
    return NextResponse.json({ error: "Invalid department" }, { status: 400 })
  }
  if (!TYPES.includes(itype as (typeof TYPES)[number])) {
    return NextResponse.json({ error: "type must be temporary or permanent" }, { status: 400 })
  }

  const placed = start && !Number.isNaN(Date.parse(start)) ? new Date(start) : new Date()

  try {
    const resolved = await resolveResidentListFacility(request, user, {
      facilityId: typeof body.facilityId === "string" ? body.facilityId : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
    })
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId } = resolved
    await connectMongo()
    const r = await ResidentModel.findOne({ id: residentId, facilityId })
    if (!r) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }
    const row = await InterventionModel.create({
      id: `int-${randomUUID()}`,
      facilityId,
      residentId,
      residentRoom: String((r as { roomNumber?: string }).roomNumber ?? ""),
      description,
      department,
      type: itype,
      isActive: true,
      placedAt: placed,
      removedAt: undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      triggeringIncidentId: body.triggeringIncidentId != null ? String(body.triggeringIncidentId) : undefined,
      createdBy: user.userId,
    })
    return NextResponse.json({ intervention: row.toJSON() }, { status: 201 })
  } catch (e) {
    return authErrorResponse(e)
  }
}
