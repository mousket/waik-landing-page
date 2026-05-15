import { NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/api-handler"
import { isPushConfigured, sendDualPushToUser } from "@/lib/push-service"

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

    const configured = isPushConfigured()
    if (!configured) {
      console.info("[Push] VAPID not configured — queued only", {
        from: currentUser.clerkUserId,
        targetUserId,
      })
      return NextResponse.json({
        success: true,
        queued: true,
        delivered: false,
        message: "VAPID not configured on server — push skipped",
      })
    }

    await sendDualPushToUser(targetUserId, {
      titlePersonal: payload.title,
      titleWork: payload.title,
      bodyPersonal: payload.body,
      bodyWork: payload.body,
      url: payload.url ?? "/staff/dashboard",
    })

    return NextResponse.json({
      success: true,
      queued: true,
      delivered: true,
      message: "Push sent where subscriptions exist",
    })
  } catch (e) {
    console.error("[Push] Handler error:", e)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
})
