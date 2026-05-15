import { NextResponse } from "next/server"

import { withAuth } from "@/lib/api-handler"
import connectMongo from "@/backend/src/lib/mongodb"
import PushSubscriptionModel from "@/backend/src/models/push-subscription.model"

export const dynamic = "force-dynamic"

export const DELETE = withAuth(async (_request, { currentUser }) => {
  try {
    await connectMongo()
    await PushSubscriptionModel.updateMany(
      { userId: currentUser.userId },
      { $set: { isActive: false } },
    ).exec()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[push/unsubscribe]", e)
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 })
  }
})
