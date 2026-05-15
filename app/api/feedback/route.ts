import { NextResponse } from "next/server"
import { z } from "zod"

import connectMongo from "@/backend/src/lib/mongodb"
import PilotFeedbackModel, { newFeedbackId } from "@/backend/src/models/feedback.model"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"

const Body = z.object({
  rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  comment: z.string().max(2000).optional().default(""),
  incidentId: z.string().max(120).optional(),
})

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const u = await getCurrentUser()
  if (!u) return unauthorizedResponse()
  if (!u.facilityId) {
    return NextResponse.json({ error: "No facility on user" }, { status: 400 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  await connectMongo()
  await PilotFeedbackModel.create({
    id: newFeedbackId(),
    facilityId: u.facilityId,
    userId: u.userId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? "",
    incidentId: parsed.data.incidentId,
  })

  return NextResponse.json({ ok: true })
}
