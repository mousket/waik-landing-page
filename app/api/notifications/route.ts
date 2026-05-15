import { NextResponse } from "next/server"

import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import NotificationModel from "@/backend/src/models/notification.model"

export const dynamic = "force-dynamic"

function toRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    incidentId: r.incidentId,
    type: r.type,
    message: r.message,
    category: r.category,
    priority: r.priority,
    actorName: r.actorName ?? null,
    actionUrl: r.actionUrl ?? null,
    facilityId: r.facilityId ?? null,
    readAt: r.readAt ? new Date(r.readAt as string | Date).toISOString() : null,
    createdAt: r.createdAt ? new Date(r.createdAt as string | Date).toISOString() : new Date().toISOString(),
  }
}

export const GET = withAuth(async (request, { currentUser }) => {
  const url = new URL(request.url)
  const sp = url.searchParams
  const unreadOnly = sp.get("unreadOnly") === "true"
  const rawLimit = Number(sp.get("limit") ?? 50)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 50

  await connectMongo()
  const query: Record<string, unknown> = {
    targetUserId: currentUser.userId,
    isArchived: { $ne: true },
  }
  if (unreadOnly) {
    query.readAt = null
  }

  const rows = await NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec()

  return NextResponse.json({ notifications: rows.map((x) => toRow(x as Record<string, unknown>)) })
})
