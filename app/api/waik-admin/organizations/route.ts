import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { generateOrgId } from "@/lib/waik-admin-utils"

export async function GET() {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  await connectMongo()
  const orgs = await OrganizationModel.find({}).sort({ createdAt: -1 }).lean().exec()

  const enriched = await Promise.all(
    orgs.map(async (org) => {
      const orgId = String(org.id)
      const [facilityCount, staffCount] = await Promise.all([
        FacilityModel.countDocuments({ organizationId: orgId, isActive: true }),
        UserModel.countDocuments({ organizationId: orgId, isWaikSuperAdmin: { $ne: true } }),
      ])
      const facilities = await FacilityModel.find({ organizationId: orgId })
        .sort({ updatedAt: -1 })
        .limit(1)
        .lean()
        .exec()
      const lastActivity = facilities[0]?.updatedAt ?? org.updatedAt
      return {
        id: orgId,
        name: org.name,
        type: org.type,
        plan: org.plan,
        isActive: org.isActive,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        facilityCount,
        staffCount,
        lastActivity,
      }
    }),
  )

  return NextResponse.json({ organizations: enriched })
}

export async function POST(request: Request) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === "string" ? b.name.trim() : ""
  const type = b.type as string | undefined
  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 })
  }

  const allowed = ["snf_chain", "independent", "government", "nonprofit", "other"]
  if (!allowed.includes(type)) {
    return NextResponse.json({ error: "Invalid organization type" }, { status: 400 })
  }

  const pc = b.primaryContact as { name?: string; email?: string; phone?: string } | undefined
  const primaryContact = {
    name: typeof pc?.name === "string" ? pc.name : "",
    email: typeof pc?.email === "string" ? pc.email : "",
    phone: typeof pc?.phone === "string" ? pc.phone : "",
  }

  await connectMongo()
  const id = generateOrgId()
  const doc = await OrganizationModel.create({
    id,
    name,
    type,
    primaryContact,
    plan: "pilot",
    createdBySuperId: gate.clerkUserId,
    isActive: true,
  })

  const o = doc.toJSON() as Record<string, unknown>
  return NextResponse.json({
    organization: {
      id: o.id,
      name: o.name,
      type: o.type,
      plan: o.plan,
      primaryContact: o.primaryContact,
      createdBySuperId: o.createdBySuperId,
      isActive: o.isActive,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    },
  })
}
