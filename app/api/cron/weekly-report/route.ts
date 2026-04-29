/**
 * IR-3b — Weekly Intelligence Report cron handler.
 *
 * Vercel Cron schedule: Mondays at 07:00 UTC (see vercel.json).
 *
 * Auth: requires header `Authorization: Bearer ${CRON_SECRET}`.
 * Vercel Cron automatically attaches this header when CRON_SECRET is
 * set as a project env var.
 *
 * For each active facility:
 *   1. generateWeeklyReport(facilityId)
 *   2. Persist to Redis at `waik:weekly-report:<facilityId>:<weekStart>`
 *      with a 7-day TTL.
 *   3. Update `waik:weekly-report:latest:<facilityId>` pointer.
 *
 * Notification fan-out to DON / admin users is intentionally deferred
 * until the notification model schema is widened to support
 * non-incident-scoped notifications (current model requires incidentId).
 */

import { NextResponse } from "next/server"
import { generateWeeklyReport } from "@/lib/agents/weekly-report-generator"
import { getRedis } from "@/lib/redis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const REPORT_TTL_SEC = 7 * 24 * 60 * 60

function reportKey(facilityId: string, weekStart: string): string {
  return `waik:weekly-report:${facilityId}:${weekStart}`
}

function latestKey(facilityId: string): string {
  return `waik:weekly-report:latest:${facilityId}`
}

interface RunResult {
  facilityId: string
  status: "success" | "error"
  error?: string
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let facilities: Array<{ id: string; name?: string }> = []
  try {
    const { default: connectMongo } = await import("@/backend/src/lib/mongodb")
    const { default: FacilityModel } = await import("@/backend/src/models/facility.model")
    await connectMongo()
    facilities = await FacilityModel.find({ isActive: true }).select("id name").lean()
  } catch (err) {
    console.error("[weekly-report] facility load failed:", err)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }

  const redis = getRedis()
  const results: RunResult[] = []

  for (const facility of facilities) {
    if (!facility.id) continue
    try {
      const report = await generateWeeklyReport(facility.id)
      const payload = JSON.stringify(report)

      try {
        await redis.set(reportKey(facility.id, report.weekStart), payload, "EX", REPORT_TTL_SEC)
        await redis.set(latestKey(facility.id), payload, "EX", REPORT_TTL_SEC)
      } catch (cacheErr) {
        console.error(`[weekly-report] cache failed for ${facility.id}:`, cacheErr)
      }

      results.push({ facilityId: facility.id, status: "success" })
    } catch (err) {
      console.error(`[weekly-report] failed for ${facility.id}:`, err)
      results.push({
        facilityId: facility.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    generated: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "error").length,
    results,
  })
}
