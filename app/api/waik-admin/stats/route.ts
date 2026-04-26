import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import IncidentModel from "@/backend/src/models/incident.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"

function utcMonthBounds(d: Date) {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  return {
    start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
  }
}

export async function GET() {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  await connectMongo()
  const { start: monthStart, end: monthEnd } = utcMonthBounds(new Date())

  const [totalOrganizations, totalFacilities, totalStaff, incidentsThisMonth, topByOrg] = await Promise.all([
    // Same scope as GET /api/waik-admin/organizations (all rows in Pilot Communities).
    OrganizationModel.countDocuments({}),
    FacilityModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({ isWaikSuperAdmin: { $ne: true } }),
    IncidentModel.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
    IncidentModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          organizationId: { $type: "string", $nin: [null, ""] },
        },
      },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
  ])

  const topOrgId = topByOrg[0]?._id
  let mostActiveOrganizationName: string | null = null
  if (topOrgId) {
    const org = (await OrganizationModel.findOne({ id: String(topOrgId) }).lean().exec()) as {
      name?: string
    } | null
    mostActiveOrganizationName = org?.name ?? null
  }

  return NextResponse.json({
    totalOrganizations,
    totalFacilities,
    totalStaff,
    incidentsThisMonth,
    mostActiveOrganizationName,
  })
}
