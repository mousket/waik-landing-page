import { createClerkClient } from "@clerk/backend"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isAdminRole } from "@/lib/waik-roles"

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const newPassword = typeof (body as { newPassword?: unknown }).newPassword === "string"
      ? (body as { newPassword: string }).newPassword
      : ""
    const confirm =
      typeof (body as { confirmPassword?: unknown }).confirmPassword === "string"
        ? (body as { confirmPassword: string }).confirmPassword
        : undefined

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    if (confirm !== undefined && confirm !== newPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const clerk = createClerkClient({ secretKey })
    const existing = await clerk.users.getUser(user.clerkUserId)
    const pm = {
      ...(typeof existing.publicMetadata === "object" && existing.publicMetadata !== null
        ? (existing.publicMetadata as Record<string, unknown>)
        : {}),
      mustChangePassword: false,
    }

    await clerk.users.updateUser(user.clerkUserId, {
      password: newPassword,
      publicMetadata: pm,
    })

    await connectMongo()
    const now = new Date()
    await UserModel.updateOne(
      { clerkUserId: user.clerkUserId },
      { $set: { mustChangePassword: false, lastLoginAt: now } },
    )

    const dashboard = isAdminRole(user.roleSlug) ? "/admin/dashboard" : "/staff/dashboard"

    return NextResponse.json({ success: true, redirect: dashboard })
  } catch (err) {
    return authErrorResponse(err)
  }
}
