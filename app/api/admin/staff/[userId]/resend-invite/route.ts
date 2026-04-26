import { createClerkClient } from "@clerk/backend"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import UserModel from "@/backend/src/models/user.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { generateTempPassword } from "@/lib/waik-admin-utils"
import { sendStaffWelcomeEmail } from "@/lib/send-welcome-email"

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireCanInviteStaff(user)

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    await connectMongo()
    const target = await UserModel.findOne({ id: params.userId, facilityId }).exec()
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (!target.clerkUserId) {
      return NextResponse.json({ error: "User has no Clerk account" }, { status: 400 })
    }

    const facility = await FacilityModel.findOne({ id: facilityId }).lean().exec()
    const facilityName =
      facility && !Array.isArray(facility) ? String((facility as { name?: string }).name ?? "") : ""

    const tempPassword = generateTempPassword()
    const clerk = createClerkClient({ secretKey })
    const existing = await clerk.users.getUser(target.clerkUserId)
    const pm = {
      ...(typeof existing.publicMetadata === "object" && existing.publicMetadata !== null
        ? (existing.publicMetadata as Record<string, unknown>)
        : {}),
      mustChangePassword: true,
    }

    await clerk.users.updateUser(target.clerkUserId, {
      password: tempPassword,
      publicMetadata: pm,
    })

    target.mustChangePassword = true
    await target.save()

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const inviterRole = user.role.name

    try {
      await sendStaffWelcomeEmail({
        to: target.email,
        firstName: target.firstName || "there",
        facilityName,
        inviterName,
        inviterRole,
        tempPassword,
      })
    } catch (e) {
      console.error("[resend-invite] email failed:", e)
      return NextResponse.json(
        { error: "Could not send email. Check RESEND_API_KEY and EMAIL_FROM." },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
