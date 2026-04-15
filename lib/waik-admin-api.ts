import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import type { CurrentUser } from "@/lib/types"

export async function requireWaikSuperAdmin(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user?.isWaikSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return user
}
