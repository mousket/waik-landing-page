import { NextResponse, type NextRequest } from "next/server"

import connectMongo from "@/backend/src/lib/mongodb"
import NotificationModel from "@/backend/src/models/notification.model"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 })
  }

  await connectMongo()
  const res = await NotificationModel.updateOne(
    { id, targetUserId: user.userId },
    { $set: { isArchived: true } },
  ).exec()

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
