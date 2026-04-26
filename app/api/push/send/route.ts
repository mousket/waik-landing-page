// STUB — Replace with real implementation in task-12-push-notifications.
// Do not add VAPID logic here — task-12 handles that.

import { NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/api-handler"

type PushPayload = {
  title?: string
  body?: string
  url?: string
}

export const POST = withAdminAuth(async (request, { currentUser }) => {
  try {
    const body = (await request.json()) as { targetUserId?: string; payload?: PushPayload }
    const { targetUserId, payload } = body

    if (!targetUserId || !payload?.title || !payload?.body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[Push Stub] Notification queued:", {
      from: currentUser.clerkUserId,
      fromMongoUserId: currentUser.userId,
      to: targetUserId,
      facilityId: currentUser.facilityId,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      queued: true,
      delivered: false,
      message: "Notification queued (push not yet configured)",
    })
  } catch (e) {
    console.error("[Push Stub] Invalid JSON or handler error:", e)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
})
