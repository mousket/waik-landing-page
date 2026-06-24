import { randomInt } from "crypto"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import type { ResidentCareLevel } from "@/backend/src/models/resident.model"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import type { ResidentImportPreviewRow } from "@/lib/import/resident-rows"
import { parseImportDate } from "@/lib/import/resident-rows"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

function generateResidentId(): string {
  return `res-${Date.now()}-${randomInt(1000, 9999)}`
}

function residentKey(first: string, last: string, room: string): string {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}|${room.trim().toLowerCase()}`
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!user.isAdminTier && !user.canManageResidents && !user.isWaikSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const bodyRecord = body as {
      rows?: ResidentImportPreviewRow[]
      facilityId?: string
      organizationId?: string
    }
    const rows = bodyRecord.rows
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 })
    }

    const resolved = await resolveEffectiveAdminFacility(request, user, {
      bodyFacilityId: typeof bodyRecord.facilityId === "string" ? bodyRecord.facilityId : undefined,
      bodyOrganizationId: typeof bodyRecord.organizationId === "string" ? bodyRecord.organizationId : undefined,
    })
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId, organizationId } = resolved

    await connectMongo()

    const existing = await ResidentModel.find({ facilityId })
      .select("firstName lastName roomNumber")
      .lean()
      .exec()
    const existingKeys = new Set(
      existing.map((r) => {
        const doc = r as { firstName?: string; lastName?: string; roomNumber?: string }
        return residentKey(
          String(doc.firstName ?? ""),
          String(doc.lastName ?? ""),
          String(doc.roomNumber ?? ""),
        )
      }),
    )

    const results: Array<{
      label: string
      status: "created" | "skipped" | "failed"
      error?: string
    }> = []
    let created = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      const label = `${row.first_name} ${row.last_name} · ${row.room_number}`
      if (row.status_row === "error" || row.status_row === "duplicate") {
        skipped++
        results.push({ label, status: "skipped", error: row.error ?? row.status_row })
        continue
      }
      if (row.status_row !== "valid" && row.status_row !== "warning") {
        skipped++
        results.push({ label, status: "skipped", error: "Invalid row" })
        continue
      }

      const key = residentKey(row.first_name, row.last_name, row.room_number)
      if (existingKeys.has(key)) {
        skipped++
        results.push({ label, status: "skipped", error: "Already exists" })
        continue
      }

      try {
        const dob = row.date_of_birth ? parseImportDate(row.date_of_birth) : null
        const adm = row.admission_date ? parseImportDate(row.admission_date) : null
        const gender = row.gender as "male" | "female" | "other" | "prefer_not_to_say" | undefined
        const emergencyContact =
          row.emergency_contact_name || row.emergency_contact_phone || row.emergency_contact_relationship
            ? {
                name: row.emergency_contact_name,
                phone: row.emergency_contact_phone,
                relationship: row.emergency_contact_relationship,
              }
            : undefined

        const doc = await ResidentModel.create({
          id: generateResidentId(),
          facilityId,
          organizationId,
          orgId: organizationId,
          firstName: row.first_name,
          lastName: row.last_name,
          preferredName: row.preferred_name,
          roomNumber: row.room_number,
          wing: row.wing,
          careLevel: row.care_level as ResidentCareLevel,
          status: row.status,
          ...(dob ? { dateOfBirth: dob } : {}),
          ...(adm ? { admissionDate: adm } : {}),
          ...(gender && ["male", "female", "other", "prefer_not_to_say"].includes(gender)
            ? { gender }
            : {}),
          ...(row.primary_diagnosis ? { primaryDiagnosis: row.primary_diagnosis } : {}),
          ...(emergencyContact ? { emergencyContact } : {}),
        })

        existingKeys.add(key)
        created++
        results.push({ label, status: "created" })
        logActivity({
          userId: user.userId,
          userName: actorNameFromUser(user),
          role: user.roleSlug,
          facilityId,
          action: "resident_created",
          resourceType: "resident",
          resourceId: String(doc.id),
          metadata: { source: "csv", roomNumber: row.room_number },
          req: request,
        })
      } catch (e) {
        failed++
        results.push({
          label,
          status: "failed",
          error: e instanceof Error ? e.message : "Create failed",
        })
      }
    }

    return NextResponse.json({ created, skipped, failed, results })
  } catch (err) {
    return authErrorResponse(err)
  }
}
