import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { leanOne } from "@/lib/mongoose-lean"
import type { FacilityDocument } from "@/backend/src/models/facility.model"
import type { OrganizationDocument } from "@/backend/src/models/organization.model"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string; facilityId: string }> },
) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  const { orgId, facilityId } = await context.params
  await connectMongo()

  const org = leanOne<OrganizationDocument>(await OrganizationModel.findOne({ id: orgId }).lean().exec())
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const facility = leanOne<FacilityDocument>(
    await FacilityModel.findOne({ id: facilityId, organizationId: orgId }).lean().exec(),
  )
  if (!facility) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const users = await UserModel.find({ facilityId, isWaikSuperAdmin: { $ne: true } })
    .sort({ lastName: 1, firstName: 1 })
    .lean()
    .exec()

  return NextResponse.json({
    organization: { id: org.id, name: org.name, type: org.type, plan: org.plan },
    facility: {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      state: facility.state,
      bedCount: facility.bedCount,
      units: facility.units ?? [],
      plan: facility.plan,
      isActive: facility.isActive,
      onboardingDate: facility.onboardingDate,
      primaryContact: facility.primaryContact,
      reportingConfig: facility.reportingConfig,
      phaseMode: facility.phaseMode,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    },
    staff: users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      roleSlug: u.roleSlug,
      isActive: u.isActive,
      isWaikSuperAdmin: u.isWaikSuperAdmin,
      clerkUserId: u.clerkUserId,
      lastLoginAt: u.lastLoginAt,
    })),
  })
}
