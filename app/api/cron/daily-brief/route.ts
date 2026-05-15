import { NextResponse, type NextRequest } from "next/server"

import { verifyCronRequest } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const gate = verifyCronRequest(request)
  if (gate) return gate
  return NextResponse.json({
    ok: true,
    sent: 0,
    note: "Daily brief push not wired yet — CRON_SECRET auth verified.",
  })
}
