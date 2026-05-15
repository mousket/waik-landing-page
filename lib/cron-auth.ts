import { NextResponse, type NextRequest } from "next/server"

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret || !secret.trim()) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 })
  }
  const auth = request.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${secret}`) {
    return unauthorized()
  }
  return null
}
