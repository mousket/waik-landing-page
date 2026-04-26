import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import type { CurrentUser } from "@/lib/types"

export type ApiHandlerContext = { currentUser: CurrentUser }
export type ApiHandler = (request: Request, ctx: ApiHandlerContext) => Promise<Response>

/**
 * Authenticated only. Returns 401 / 403 JSON before calling handler.
 */
export function withAuth(handler: ApiHandler): (request: Request, routeContext?: unknown) => Promise<Response> {
  return async (request: Request, routeContext?: unknown) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (currentUser.mustChangePassword) {
        return NextResponse.json({ error: "Password change required" }, { status: 403 })
      }

      return handler(request, { ...(routeContext as object), currentUser })
    } catch (error) {
      console.error("API error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

/**
 * Admin-tier or WAiK super-admin only.
 */
export function withAdminAuth(handler: ApiHandler): (request: Request, routeContext?: unknown) => Promise<Response> {
  return withAuth(async (request, ctx) => {
    if (!ctx.currentUser.isAdminTier && !ctx.currentUser.isWaikSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(request, ctx)
  })
}
