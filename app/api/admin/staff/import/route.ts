import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import { isValidEmail } from "@/lib/admin-staff-invite"
import { parseStaffCsv } from "@/lib/csv-staff"
import { authErrorResponse, getCurrentUser, unauthorizedResponse, requireFacilityAccess } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"

type RowStatus = "valid" | "error" | "duplicate"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireCanInviteStaff(user)

    const facilityId = user.facilityId
    requireFacilityAccess(user, facilityId)

    const form = await request.formData()
    const file = form.get("file")
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 })
    }

    const text = await file.text()
    const { headers, rows } = parseStaffCsv(text)

    const required = ["first_name", "last_name", "email", "role_slug"]
    const missing = required.filter((h) => !headers.includes(h))
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing columns: ${missing.join(", ")}`, rows: [] },
        { status: 400 },
      )
    }

    await connectMongo()
    const allRoles = await RoleModel.find({}).lean().exec()
    const slugSet = new Set(allRoles.map((r) => r.slug))

    const existingEmails = await UserModel.find({ facilityId }).select("email").lean().exec()
    const emailSet = new Set(existingEmails.map((u) => u.email.toLowerCase()))

    const out: Array<{
      first_name: string
      last_name: string
      email: string
      role_slug: string
      phone?: string
      status: RowStatus
      error?: string
    }> = []

    for (const raw of rows) {
      const first_name = (raw["first_name"] ?? "").trim()
      const last_name = (raw["last_name"] ?? "").trim()
      const email = (raw["email"] ?? "").trim().toLowerCase()
      const role_slug = (raw["role_slug"] ?? "").trim()
      const phone = (raw["phone"] ?? "").trim() || undefined

      if (!email) {
        out.push({
          first_name,
          last_name,
          email,
          role_slug,
          phone,
          status: "error",
          error: "Email is required",
        })
        continue
      }
      if (!isValidEmail(email)) {
        out.push({
          first_name,
          last_name,
          email,
          role_slug,
          phone,
          status: "error",
          error: "Invalid email format",
        })
        continue
      }
      if (!first_name || !last_name) {
        out.push({
          first_name,
          last_name,
          email,
          role_slug,
          phone,
          status: "error",
          error: "First and last name are required",
        })
        continue
      }
      if (!role_slug || !slugSet.has(role_slug)) {
        out.push({
          first_name,
          last_name,
          email,
          role_slug,
          phone,
          status: "error",
          error: "Invalid or unknown role_slug",
        })
        continue
      }
      if (emailSet.has(email)) {
        out.push({
          first_name,
          last_name,
          email,
          role_slug,
          phone,
          status: "duplicate",
          error: "Already exists in this facility",
        })
        continue
      }

      emailSet.add(email)
      out.push({ first_name, last_name, email, role_slug, phone, status: "valid" })
    }

    return NextResponse.json({ rows: out })
  } catch (err) {
    return authErrorResponse(err)
  }
}
