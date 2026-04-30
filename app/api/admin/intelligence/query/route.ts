import { NextResponse } from "next/server"
import { answerCrossFacilityIntelligence, type FacilityIntelligenceScope } from "@/lib/agents/intelligence-qa"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export const POST = withAdminAuth(async (request, { currentUser: user }) => {
  let body: {
    query?: string
    question?: string
    scope?: "personal" | "facility"
    facilityId?: string
    organizationId?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const q = (body.query ?? body.question ?? "").trim()
  if (!q) {
    return NextResponse.json({ error: "query is required" }, { status: 400 })
  }
  if (q.length > 2000) {
    return NextResponse.json({ error: "query too long" }, { status: 400 })
  }

  const r = await resolveEffectiveAdminFacility(request, user, {
    bodyFacilityId: body.facilityId,
    bodyOrganizationId: body.organizationId,
  })
  if (isEffectiveAdminFacilityError(r)) {
    return r.error
  }
  const { facilityId } = r

  const scopeArg: FacilityIntelligenceScope =
    body.scope === "personal" ? "personal" : "facility"

  try {
    const out = await answerCrossFacilityIntelligence({
      facilityId,
      queryingUserId: user.userId,
      question: q,
      scope: scopeArg,
    })
    return NextResponse.json(
      {
        answer: out.answer,
        facilityId,
        citations: out.citations,
        scope: out.scope,
        timestamp: out.timestamp,
        searchMethod: out.searchMethod,
      },
      { status: 200 },
    )
  } catch (e) {
    console.error("[admin intelligence query]", e)
    return NextResponse.json({ error: "Failed to answer" }, { status: 500 })
  }
})
