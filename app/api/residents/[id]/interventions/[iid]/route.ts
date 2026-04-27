import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import InterventionModel from "@/backend/src/models/intervention.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"
import { isAdminRole } from "@/lib/waik-roles"

export const dynamic = "force-dynamic"

function canUpdate(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): boolean {
  if (isAdminRole(String(user.roleSlug)) || user.isAdminTier) {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; iid: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  if (!canUpdate(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id: residentId, iid } = await params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const isActive = body.isActive
  const notes = body.notes != null ? String(body.notes) : undefined

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
    const v = await InterventionModel.findOne({ id: iid, facilityId, residentId })
    if (!v) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 })
    }
    if (typeof isActive === "boolean") {
      if (v.isActive && !isActive) {
        v.isActive = false
        v.removedAt = new Date()
      } else if (!v.isActive && isActive) {
        v.isActive = true
        v.removedAt = undefined
      }
    }
    if (notes != null) {
      v.notes = notes
    }
    await v.save()
    return NextResponse.json({ intervention: v.toObject ? v.toObject() : v })
  } catch (e) {
    return authErrorResponse(e)
  }
}
