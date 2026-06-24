import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import { parseImportFile } from "@/lib/import-parser"
import { staffImportMissingHeaders, validateStaffImportRows } from "@/lib/import/staff-rows"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireCanInviteStaff(user)

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

    const missing = staffImportMissingHeaders(headers)
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing columns: ${missing.join(", ")}`, rows: [] },
        { status: 400 },
      )
    }

    await connectMongo()
    const allRoles = await RoleModel.find({}).lean().exec()
    const slugSet = new Set(allRoles.map((r) => String((r as { slug?: string }).slug ?? "")))

    const existingEmails = await UserModel.find({ facilityId }).select("email").lean().exec()
    const emailSet = new Set(existingEmails.map((u) => String((u as { email?: string }).email ?? "").toLowerCase()))

    const out = validateStaffImportRows(rows, { roleSlugs: slugSet, existingEmails: emailSet })

    return NextResponse.json({ rows: out })
  } catch (err) {
    return authErrorResponse(err)
  }
}
