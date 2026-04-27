import { NextResponse } from "next/server"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"

/**
 * Server truth for `mustChangePassword` (Mongo user record, synced on invite / password change).
 * Used by middleware; must stay exempt from the forced password redirect.
 */
export async function GET() {
  const u = await getCurrentUser()
  if (!u) return unauthorizedResponse()
  return NextResponse.json({
    mustChangePassword: Boolean(u.mustChangePassword),
    userId: u.userId,
  })
}
