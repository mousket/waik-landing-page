import { NextResponse } from "next/server"
import {
  answerCrossFacilityIntelligence,
  type FacilityIntelligenceScope,
} from "@/lib/agents/intelligence-qa"
import { getCurrentUser } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Facility intelligence Q&A (staff + admin). Scoped to the signed-in user's facility.
 * Admins default to facility-wide; staff to their own reports unless restricted by product rules.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user.facilityId) {
    return NextResponse.json({ error: "Facility required" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw =
    (typeof body.question === "string" && body.question.trim()
      ? body.question
      : typeof body.query === "string"
        ? body.query
        : "") ?? ""
  const q = raw.trim()

  if (!q) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }
  if (q.length > 2000) {
    return NextResponse.json({ error: "question too long" }, { status: 400 })
  }

  const scopeParam =
    body.scope === "personal" || body.scope === "facility" ? body.scope : undefined

  let effective: FacilityIntelligenceScope
  if (!user.isAdminTier && !user.isWaikSuperAdmin) {
    effective = "personal"
  } else {
    effective = scopeParam === "personal" ? "personal" : "facility"
  }

  try {
    const out = await answerCrossFacilityIntelligence({
      facilityId: user.facilityId,
      queryingUserId: user.userId,
      question: q,
      scope: effective,
    })

    return NextResponse.json({
      answer: out.answer,
      citations: out.citations,
      scope: out.scope,
      timestamp: out.timestamp,
      searchMethod: out.searchMethod,
      facilityId: user.facilityId,
    })
  } catch (e) {
    console.error("[intelligence/query]", e)
    return NextResponse.json({ error: "Intelligence query failed" }, { status: 500 })
  }
}
