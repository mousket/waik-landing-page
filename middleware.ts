import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * WAiK Middleware
 * 
 * Handles CORS for API routes to allow V0 and other Vercel previews
 * to access the centralized backend at waik-demo-vercel.app
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  
  // Main deployment
  "https://waik-demo-vercel.app",
  "https://waik-demo.vercel.app",
  
  // Production
  "https://waik.care",
  "https://www.waik.care",
]

// Pattern for V0 and Vercel preview deployments
const VERCEL_PREVIEW_PATTERN = /^https:\/\/.*\.vercel\.app$/

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true
  }
  
  // Check Vercel preview pattern (allows all *.vercel.app)
  if (VERCEL_PREVIEW_PATTERN.test(origin)) {
    return true
  }
  
  return false
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-WAiK-Proxy, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
  
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  
  return headers
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get("origin")
  
  // Only apply CORS to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  
  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    const headers = getCorsHeaders(origin)
    return new NextResponse(null, {
      status: 204,
      headers,
    })
  }
  
  // For actual requests, add CORS headers to response
  const response = NextResponse.next()
  const corsHeaders = getCorsHeaders(origin)
  
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  
  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
}

