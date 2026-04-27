import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { generateFacilityId } from "@/lib/waik-admin-utils"
import { leanOne } from "@/lib/mongoose-lean"
import type { OrganizationDocument } from "@/backend/src/models/organization.model"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string }> },
) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  const { orgId } = await context.params
  await connectMongo()

  const org = leanOne<OrganizationDocument>(await OrganizationModel.findOne({ id: orgId }).lean().exec())
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const list = await FacilityModel.find({ organizationId: orgId }).sort({ name: 1 }).lean().exec()
  return NextResponse.json({
    facilities: list.map((f) => ({
      id: f.id,
      organizationId: f.organizationId,
      name: f.name,
      type: f.type,
      state: f.state,
      bedCount: f.bedCount,
      units: f.units,
      isActive: f.isActive,
      onboardingDate: f.onboardingDate,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> },
) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  const { orgId } = await context.params
  await connectMongo()

  const org = leanOne<OrganizationDocument>(await OrganizationModel.findOne({ id: orgId }).lean().exec())
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === "string" ? b.name.trim() : ""
  const type = b.type as string | undefined
  const state = typeof b.state === "string" ? b.state.trim().toUpperCase() : ""
  if (!name || !type || !state || state.length !== 2) {
    return NextResponse.json({ error: "name, type, and state (2-letter code) are required" }, { status: 400 })
  }

  const allowed = ["snf", "alf", "memory_care", "ccrc", "other"]
  if (!allowed.includes(type)) {
    return NextResponse.json({ error: "Invalid facility type" }, { status: 400 })
  }

  const bedCount = typeof b.bedCount === "number" && !Number.isNaN(b.bedCount) ? b.bedCount : undefined
  const unitsRaw = typeof b.units === "string" ? b.units : ""
  const units = unitsRaw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)

  const pc = b.primaryContact as { name?: string; email?: string; phone?: string } | undefined
  const primaryContact = {
    name: typeof pc?.name === "string" ? pc.name : "",
    email: typeof pc?.email === "string" ? pc.email : "",
    phone: typeof pc?.phone === "string" ? pc.phone : "",
  }

  const id = generateFacilityId()
  const now = new Date()
  const doc = await FacilityModel.create({
    id,
    organizationId: orgId,
    name,
    type,
    state,
    bedCount,
    primaryContact,
    onboardingDate: now,
    units,
    plan: "pilot",
    isActive: true,
  })

  const f = doc.toJSON() as Record<string, unknown>
  return NextResponse.json({ facility: f })
}
