import { randomInt } from "crypto"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse, requireFacilityAccess } from "@/lib/auth"
import type { ResidentCareLevel } from "@/backend/src/models/resident.model"

function canManageResidents(user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  if (!user) return false
  return user.isAdminTier || user.canManageResidents
}

function generateResidentId(): string {
  return `res-${Date.now()}-${randomInt(1000, 9999)}`
}

const CARE: ResidentCareLevel[] = ["independent", "assisted", "memory_care", "skilled_nursing"]

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!canManageResidents(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const facilityId = user.facilityId
    requireFacilityAccess(user, facilityId)

    await connectMongo()
    const residents = await ResidentModel.find({ facilityId, status: "active" })
      .sort({ lastName: 1, firstName: 1 })
      .lean()
      .exec()

    return NextResponse.json({
      residents: residents.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        roomNumber: r.roomNumber,
        careLevel: r.careLevel,
        status: r.status,
        createdAt: r.createdAt?.toISOString?.() ?? null,
      })),
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!canManageResidents(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const facilityId = user.facilityId
    const organizationId = user.organizationId
    requireFacilityAccess(user, facilityId)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const firstName = typeof b.firstName === "string" ? b.firstName.trim() : ""
    const lastName = typeof b.lastName === "string" ? b.lastName.trim() : ""
    const roomNumber = typeof b.roomNumber === "string" ? b.roomNumber.trim() : ""
    const careLevel = typeof b.careLevel === "string" ? b.careLevel.trim() : ""

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 })
    }
    if (!careLevel || !CARE.includes(careLevel as ResidentCareLevel)) {
      return NextResponse.json({ error: "Invalid careLevel" }, { status: 400 })
    }

    await connectMongo()
    const doc = await ResidentModel.create({
      id: generateResidentId(),
      facilityId,
      organizationId,
      firstName,
      lastName,
      roomNumber,
      careLevel: careLevel as ResidentCareLevel,
      status: "active",
    })

    return NextResponse.json({
      resident: {
        id: doc.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        roomNumber: doc.roomNumber,
        careLevel: doc.careLevel,
      },
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}
