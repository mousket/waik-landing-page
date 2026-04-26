import { createClerkClient } from "@clerk/backend"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireCanInviteStaff } from "@/lib/permissions"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
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

    target.isActive = false
    await target.save()

    if (target.clerkUserId) {
      const clerk = createClerkClient({ secretKey })
      await clerk.users.updateUser(target.clerkUserId, { banned: true } as never)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
