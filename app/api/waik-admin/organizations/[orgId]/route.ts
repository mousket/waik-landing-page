import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { leanOne } from "@/lib/mongoose-lean"
import type { OrganizationDocument } from "@/backend/src/models/organization.model"

export async function GET(_request: Request, { params }: { params: { orgId: string } }) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  const { orgId } = params
  await connectMongo()

  const org = leanOne<OrganizationDocument>(await OrganizationModel.findOne({ id: orgId }).lean().exec())
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const facilitiesRaw = await FacilityModel.find({ organizationId: orgId }).sort({ name: 1 }).lean().exec()
  const facilities = await Promise.all(
    facilitiesRaw.map(async (f) => {
      const staffCount = await UserModel.countDocuments({
        facilityId: String(f.id),
        isWaikSuperAdmin: { $ne: true },
      })
      return {
        id: String(f.id),
        name: f.name,
        type: f.type,
        state: f.state,
        bedCount: f.bedCount,
        isActive: f.isActive,
        staffCount,
        updatedAt: f.updatedAt,
      }
    }),
  )

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      primaryContact: org.primaryContact,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    },
    facilities,
  })
}
