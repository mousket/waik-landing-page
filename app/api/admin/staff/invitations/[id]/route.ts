import { createClerkClient } from "@clerk/backend"
import { NextResponse, type NextRequest } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

/**
 * Revoke a pending (never signed in) user by business id — removes Mongo + Clerk.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await context.params
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
    const target = await UserModel.findOne({ id: userId, facilityId }).exec()
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (target.lastLoginAt) {
      return NextResponse.json({ error: "Only pending invites can be cancelled" }, { status: 400 })
    }
    if (!target.isActive) {
      return NextResponse.json({ error: "User is not pending" }, { status: 400 })
    }

    if (target.clerkUserId) {
      const clerk = createClerkClient({ secretKey })
      try {
        await clerk.users.deleteUser(target.clerkUserId)
      } catch (e) {
        console.error("[cancel-invite] clerk delete", e)
        return NextResponse.json({ error: "Could not remove invitation" }, { status: 502 })
      }
    }

    await UserModel.deleteOne({ id: userId, facilityId }).exec()

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
