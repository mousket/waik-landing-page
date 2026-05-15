import { NextResponse } from "next/server"
import { z } from "zod"

import connectMongo from "@/backend/src/lib/mongodb"
import UserModel from "@/backend/src/models/user.model"
import PushSubscriptionModel from "@/backend/src/models/push-subscription.model"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"

const Body = z.object({
  deviceType: z.enum(["personal", "work"]),
})

export const dynamic = "force-dynamic"

export async function PATCH(request: Request) {
  const u = await getCurrentUser()
  if (!u) return unauthorizedResponse()

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "deviceType must be personal or work" }, { status: 400 })
  }

  await connectMongo()
  await UserModel.updateOne(
    { clerkUserId: u.clerkUserId },
    { $set: { deviceType: parsed.data.deviceType, updatedAt: new Date() } },
  ).exec()

  await PushSubscriptionModel.updateMany(
    { userId: u.userId, isActive: true },
    { $set: { deviceType: parsed.data.deviceType } },
  ).exec()

  return NextResponse.json({ ok: true, deviceType: parsed.data.deviceType })
}
