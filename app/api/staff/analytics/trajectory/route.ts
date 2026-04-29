import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { sameIdsForOrMatch } from "@/lib/staff-identity"
import { getStaffTrajectory } from "@/lib/analytics/staff-trajectory"
import getRedis from "@/lib/redis"

const CACHE_TTL_SEC = 600

export const GET = withAuth(async (_request, { currentUser }) => {
  const { facilityId } = currentUser
  const ids = sameIdsForOrMatch(currentUser)
  const primary = ids[0] || currentUser.userId || ""
  const cacheKey = `waik:analytics:trajectory:${facilityId}:${primary}`

  try {
    const redis = getRedis()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached))
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[trajectory] Redis cache read skipped:", msg)
  }

  const trajectory = await getStaffTrajectory(ids.length ? ids : [primary], String(facilityId || ""))

  try {
    const redis = getRedis()
    await redis.set(cacheKey, JSON.stringify(trajectory), "EX", CACHE_TTL_SEC)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[trajectory] Redis cache store skipped:", msg)
  }

  return NextResponse.json(trajectory)
})
