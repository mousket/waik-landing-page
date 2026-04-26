import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { withAdminAuth } from "@/lib/api-handler"

type FacilityOption = {
  id: string
  name: string
  organizationId: string
}

export const GET = withAdminAuth(async (_request, { currentUser }) => {
  await connectMongo()

  // Super admins: can pick any active facility.
  if (currentUser.isWaikSuperAdmin) {
    const rows = await FacilityModel.find({ isActive: true })
      .select({ id: 1, name: 1, organizationId: 1, _id: 0 })
      .sort({ name: 1 })
      .lean()
      .exec()

    const facilities: FacilityOption[] = rows.map((r) => ({
      id: String((r as any).id ?? ""),
      name: String((r as any).name ?? ""),
      organizationId: String((r as any).organizationId ?? ""),
    }))

    return NextResponse.json({ facilities })
  }

  // Admin-tier users: for now, allow selecting any facility in the same org (or fallback to their single facility).
  const orgId = (currentUser.organizationId || "").trim()
  if (orgId) {
    const rows = await FacilityModel.find({ organizationId: orgId, isActive: true })
      .select({ id: 1, name: 1, organizationId: 1, _id: 0 })
      .sort({ name: 1 })
      .lean()
      .exec()

    const facilities: FacilityOption[] = rows.map((r) => ({
      id: String((r as any).id ?? ""),
      name: String((r as any).name ?? ""),
      organizationId: String((r as any).organizationId ?? orgId),
    }))

    // Ensure their assigned facility is always present, even if facility docs are incomplete.
    const fallbackFacilityId = (currentUser.facilityId || "").trim()
    if (fallbackFacilityId && !facilities.some((f) => f.id === fallbackFacilityId)) {
      facilities.unshift({ id: fallbackFacilityId, name: "Current facility", organizationId: orgId })
    }

    return NextResponse.json({ facilities })
  }

  const facilityId = (currentUser.facilityId || "").trim()
  const facilities: FacilityOption[] = facilityId
    ? [{ id: facilityId, name: "Current facility", organizationId: "" }]
    : []

  return NextResponse.json({ facilities })
})

