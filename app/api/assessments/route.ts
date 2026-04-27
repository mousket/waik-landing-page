import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"

import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import { withAuth } from "@/lib/api-handler"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { authErrorResponse } from "@/lib/auth"

export const dynamic = "force-dynamic"

type CreateBody = {
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: "activity" | "dietary" | "clinical" | "behavioral"
  status?: "scheduled" | "in_progress" | "completed" | "overdue"
  completenessScore?: number
}

function resolveFacilityId(
  u: { facilityId: string; isWaikSuperAdmin: boolean },
  queryFacility: string | null,
): string {
  if (u.isWaikSuperAdmin) {
    const f = (queryFacility ?? u.facilityId).trim()
    if (!f) {
      const err = new Error("facilityId required for super admin")
      ;(err as Error & { status: number }).status = 400
      throw err
    }
    return f
  }
  if (queryFacility && queryFacility !== u.facilityId) {
    const err = new Error("Forbidden")
    ;(err as Error & { status: number }).status = 403
    throw err
  }
  if (!u.facilityId) {
    const err = new Error("No facility assigned to user")
    ;(err as Error & { status: number }).status = 400
    throw err
  }
  return u.facilityId
}

export const GET = withAuth(async (req, { currentUser: u }) => {
  try {
    const { searchParams } = new URL(req.url)
    const residentId = searchParams.get("residentId")
    const facilityId = resolveFacilityId(u, searchParams.get("facilityId"))

    await connectMongo()
    const q: Record<string, string> = { facilityId: facilityId }
    if (residentId) {
      q.residentId = residentId
    }

    const rows = await AssessmentModel.find(q).sort({ conductedAt: -1 }).limit(100).lean().exec()

    return NextResponse.json({
      assessments: rows,
      total: rows.length,
    })
  } catch (e) {
    return authErrorResponse(e)
  }
})

export const POST = withAuth(async (req, { currentUser: u }) => {
  try {
    const body = (await req.json()) as CreateBody
    if (!body.residentId || !body.residentRoom || !body.assessmentType) {
      return NextResponse.json(
        { error: "residentId, residentRoom, and assessmentType are required" },
        { status: 400 },
      )
    }

    const organizationId = u.organizationId
    if (!u.facilityId) {
      return NextResponse.json({ error: "No facility assigned" }, { status: 400 })
    }

    await connectMongo()
    const now = new Date()
    const id = `assess-${randomUUID()}`

    const doc = await AssessmentModel.create({
      id,
      facilityId: u.facilityId,
      organizationId,
      residentId: body.residentId,
      residentName: body.residentName ?? "Unknown",
      residentRoom: body.residentRoom,
      assessmentType: body.assessmentType,
      conductedById: u.userId,
      conductedByName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "User",
      conductedAt: now,
      completenessScore: body.completenessScore ?? 0,
      status: body.status ?? "in_progress",
      nextDueAt: undefined,
      createdAt: now,
      updatedAt: now,
    })

    const o = doc.toObject ? doc.toObject() : doc
    const outId = (o as { id: string }).id
    if (body.status === "completed") {
      logActivity({
        userId: u.userId,
        userName: actorNameFromUser(u),
        role: u.roleSlug,
        facilityId: u.facilityId,
        action: "assessment_completed",
        resourceType: "assessment",
        resourceId: outId,
        metadata: { assessmentType: body.assessmentType, residentId: body.residentId },
        req,
      })
    }
    return NextResponse.json({ id: outId, assessment: o }, { status: 201 })
  } catch (e) {
    return authErrorResponse(e)
  }
})
