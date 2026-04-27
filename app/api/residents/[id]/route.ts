import { NextResponse } from "next/server"
import ResidentModel from "@/backend/src/models/resident.model"
import connectMongo from "@/backend/src/lib/mongodb"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"
import { fetchResidentDetail } from "@/lib/resident-profile.server"
import { isAdminRole } from "@/lib/waik-roles"

export const dynamic = "force-dynamic"

function canUpdateResident(user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  if (!user) {
    return false
  }
  if (isAdminRole(String(user.roleSlug))) {
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
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  const { id } = await params
  try {
    const resolved = await resolveResidentListFacility(request, user)
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId } = resolved
    const detail = await fetchResidentDetail({ facilityId, residentId: id, user })
    if (detail && "error" in detail) {
      return NextResponse.json(detail.body, { status: detail.error })
    }
    return NextResponse.json(detail)
  } catch (e) {
    return authErrorResponse(e)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (!canUpdateResident(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
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
    await connectMongo()
    const r = await ResidentModel.findOne({ id, facilityId })
    if (!r) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }

    const m = (r as Record<string, unknown> & { save: () => Promise<unknown> })
    if (typeof body.preferredName === "string") {
      m.preferredName = body.preferredName
    }
    if (typeof body.firstName === "string") {
      m.firstName = body.firstName
    }
    if (typeof body.lastName === "string") {
      m.lastName = body.lastName
    }
    if (typeof body.roomNumber === "string") {
      m.roomNumber = body.roomNumber
    }
    if (typeof body.careLevel === "string") {
      m.careLevel = body.careLevel
    }
    if (typeof body.wing === "string") {
      m.wing = body.wing
    }
    if (typeof body.status === "string") {
      m.status = body.status
    }
    if (typeof body.primaryDiagnosis === "string") {
      m.primaryDiagnosis = body.primaryDiagnosis
    }
    if (body.emergencyContact && typeof body.emergencyContact === "object") {
      m.emergencyContact = body.emergencyContact
    }
    m.organizationId = m.organizationId ?? organizationId
    m.orgId = organizationId
    await m.save()
    return NextResponse.json({ resident: r.toJSON() })
  } catch (e) {
    return authErrorResponse(e)
  }
}
