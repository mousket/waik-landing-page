import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import { parseImportFile } from "@/lib/import-parser"
import { residentImportMissingHeaders, validateResidentImportRows } from "@/lib/import/resident-rows"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

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

    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    const form = await request.formData()
    const file = form.get("file")
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 })
    }

    const fileName = file instanceof File ? file.name : "upload.csv"
    const { headers, rows } = await parseImportFile(file, fileName)

    const missing = residentImportMissingHeaders(headers)
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing columns: ${missing.join(", ")}`, rows: [] },
        { status: 400 },
      )
    }

    await connectMongo()
    const existing = await ResidentModel.find({ facilityId })
      .select("firstName lastName roomNumber")
      .lean()
      .exec()

    const existingKeys = new Set<string>()
    const roomNamePairs = new Set<string>()
    for (const r of existing) {
      const doc = r as { firstName?: string; lastName?: string; roomNumber?: string }
      const fn = String(doc.firstName ?? "")
      const ln = String(doc.lastName ?? "")
      const room = String(doc.roomNumber ?? "")
      existingKeys.add(residentKey(fn, ln, room))
      roomNamePairs.add(`${room.toLowerCase()}|${fn.toLowerCase()}|${ln.toLowerCase()}`)
    }

    const out = validateResidentImportRows(rows, { existingKeys, roomNamePairs })

    return NextResponse.json({ rows: out })
  } catch (err) {
    return authErrorResponse(err)
  }
}
