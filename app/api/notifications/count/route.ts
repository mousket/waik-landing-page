import { NextResponse } from "next/server"

import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import NotificationModel from "@/backend/src/models/notification.model"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (_request, { currentUser }) => {
  await connectMongo()
  const unread = await NotificationModel.countDocuments({
    targetUserId: currentUser.userId,
    readAt: null,
    isArchived: { $ne: true },
  }).exec()

  return NextResponse.json({ unread })
})
