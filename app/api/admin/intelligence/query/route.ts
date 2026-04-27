import { NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { answerCommunityQuery } from "@/lib/admin-community-intelligence"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export const POST = withAdminAuth(async (request, { currentUser: user }) => {
  let body: { query?: string; facilityId?: string; organizationId?: string }
  try {
    body = (await request.json()) as { query?: string; facilityId?: string; organizationId?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const q = (body.query ?? "").trim()
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

  try {
    const answer = await answerCommunityQuery(facilityId, q)
    return NextResponse.json({ answer, facilityId }, { status: 200 })
  } catch (e) {
    console.error("[admin intelligence query]", e)
    return NextResponse.json({ error: "Failed to answer" }, { status: 500 })
  }
})
