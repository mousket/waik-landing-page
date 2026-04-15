import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"

export async function GET() {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  await connectMongo()
  const [totalOrganizations, totalFacilities, totalStaff] = await Promise.all([
    OrganizationModel.countDocuments({ isActive: true }),
    FacilityModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({ isWaikSuperAdmin: { $ne: true } }),
  ])

  return NextResponse.json({
    totalOrganizations,
    totalFacilities,
    totalStaff,
  })
}
