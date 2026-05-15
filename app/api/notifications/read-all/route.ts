import { NextResponse } from "next/server"

import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import NotificationModel from "@/backend/src/models/notification.model"

export const dynamic = "force-dynamic"

export const PATCH = withAuth(async (_request, { currentUser }) => {
  await connectMongo()
  const now = new Date()
  await NotificationModel.updateMany(
    {
      targetUserId: currentUser.userId,
      readAt: null,
      isArchived: { $ne: true },
    },
    { $set: { readAt: now } },
  ).exec()
  return NextResponse.json({ ok: true })
})
