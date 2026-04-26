import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { createClerkClient } from "@clerk/backend"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"

/**
 * Public routes — no Clerk session required.
 * Everything else runs `auth.protect()` (redirect to sign-in for pages, 401 for APIs).
 * `/auth/redirect` is NOT public — it requires a session for role-based routing after sign-in.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/waik-demo-start(.*)",
  "/offline(.*)",
  "/auth/after-sign-in(.*)",
  "/auth/account-pending(.*)",
  "/accept-invite(.*)",
  "/sign-out(.*)",
])

function isMustChangePasswordExempt(pathname: string): boolean {
  if (pathname.startsWith("/sign-in")) return true
  if (pathname.startsWith("/sign-up")) return true
  if (pathname.startsWith("/login")) return true
  if (pathname.startsWith("/accept-invite")) return true
  if (pathname === "/change-password" || pathname.startsWith("/change-password/")) return true
  if (pathname.startsWith("/api/auth/change-password")) return true
  if (pathname.startsWith("/auth/after-sign-in")) return true
  if (pathname.startsWith("/auth/account-pending")) return true
  if (pathname.includes("/sign-out")) return true
  return false
}

const clerk = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  const { userId } = await auth()
  const pathname = request.nextUrl.pathname

  if (userId && !isMustChangePasswordExempt(pathname)) {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (secretKey) {
      try {
        const clerkClient = createClerkClient({ secretKey })
        const u = await clerkClient.users.getUser(userId)
        const meta = u.publicMetadata as { mustChangePassword?: boolean } | undefined
        if (meta?.mustChangePassword === true) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "Password change required", code: "must_change_password" },
              { status: 403 },
            )
          }
          const url = request.nextUrl.clone()
          url.pathname = "/change-password"
          url.search = ""
          return NextResponse.redirect(url)
        }
      } catch (e) {
        console.error("[middleware] mustChangePassword check failed:", e)
      }
    }
  }

  return NextResponse.next()
})

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "https://waik-demo-vercel.app",
  "https://waik-demo.vercel.app",
  "https://waik.care",
  "https://www.waik.care",
]

const VERCEL_PREVIEW_PATTERN = /^https:\/\/.*\.vercel\.app$/

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (VERCEL_PREVIEW_PATTERN.test(origin)) return true
  return false
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-WAiK-Proxy, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  return headers
}

function applyCorsToResponse(response: NextResponse, origin: string | null): NextResponse {
  const corsHeaders = getCorsHeaders(origin)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get("origin")

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  const response = await clerk(request, event)

  if (pathname.startsWith("/api/") && response) {
    return applyCorsToResponse(response as NextResponse, origin)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
