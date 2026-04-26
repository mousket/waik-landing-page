import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { emitWaikTelemetry } from "@/lib/telemetry-sink"

/**
 * Lightweight server-side event for “super admin opened org-scoped admin”.
 * Logs a single JSON line (grep for WAiK_TELEMETRY). Replace with your analytics pipeline later.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.isWaikSuperAdmin) {
    return NextResponse.json({ ok: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as { organizationId?: unknown; facilityId?: unknown }
  const organizationId = typeof b.organizationId === "string" ? b.organizationId.trim() : ""
  const facilityId = typeof b.facilityId === "string" ? b.facilityId.trim() : ""

  if (!organizationId) {
    return NextResponse.json({ ok: true })
  }

  emitWaikTelemetry({
    type: "super_admin_admin_entry",
    organizationId,
    facilityId: facilityId || null,
    userId: user.userId,
    at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
