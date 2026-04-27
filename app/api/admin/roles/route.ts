import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import RoleModel from "@/backend/src/models/role.model"
import { filterRolesAssignableByInviter } from "@/lib/role-assignment-permissions"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { requireAdminTier } from "@/lib/permissions"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)

    const url = new URL(request.url)
    const assignable =
      url.searchParams.get("assignable") === "1" || url.searchParams.get("assignable") === "true"

    await connectMongo()
    const allRoles = await RoleModel.find({}).sort({ name: 1 }).lean().exec()
    const mapped = allRoles.map((r) => {
      const d = r as { id?: string; name?: string; slug?: string; canInviteStaff?: boolean }
      return {
        id: String(d.id ?? ""),
        name: String(d.name ?? ""),
        slug: String(d.slug ?? ""),
        canInviteStaff: Boolean(d.canInviteStaff),
      }
    })
    const list = assignable ? filterRolesAssignableByInviter(user.roleSlug, mapped) : mapped

    return NextResponse.json({
      roles: list.map((r) => ({
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
