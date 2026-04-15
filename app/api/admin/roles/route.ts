import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireAdminTier } from "@/lib/permissions"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)

    await connectMongo()
    const roles = await RoleModel.find({}).sort({ name: 1 }).lean().exec()

    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        canInviteStaff: r.canInviteStaff,
      })),
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}
