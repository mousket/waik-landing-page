import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import PushSubscriptionModel from "@/backend/src/models/push-subscription.model"
import UserModel from "@/backend/src/models/user.model"

export const dynamic = "force-dynamic"

type PushSubBody = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null }
}

export const POST = withAuth(async (request, { currentUser }) => {
  try {
    const body = (await request.json()) as PushSubBody
    const sub = body.subscription
    const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint.trim() : ""
    if (!endpoint || !sub) {
      return NextResponse.json({ error: "subscription.endpoint required" }, { status: 400 })
    }

    await connectMongo()

    const mongoUser = await UserModel.findOne({ clerkUserId: currentUser.clerkUserId })
      .select(["deviceType"])
      .lean()
      .exec()

    const deviceType =
      mongoUser && !Array.isArray(mongoUser)
        ? (((mongoUser as { deviceType?: string }).deviceType ?? "personal") === "work" ? "work" : "personal")
        : currentUser.deviceType ?? "personal"

    const id = `psub-${randomUUID()}`
    await PushSubscriptionModel.findOneAndUpdate(
      { userId: currentUser.userId, endpoint },
      {
        $set: {
          subscription: sub,
          facilityId: currentUser.facilityId,
          deviceType,
          userAgent: request.headers.get("user-agent") ?? "",
          isActive: true,
          lastUsedAt: new Date(),
        },
        $setOnInsert: {
          id,
          userId: currentUser.userId,
          endpoint,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    ).exec()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[push/subscribe]", e)
    return NextResponse.json({ error: "Subscribe failed" }, { status: 400 })
  }
})
