/**
 * CORS Configuration for WAiK API
 * 
 * Allows cross-origin requests from V0 previews and other authorized domains
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Allowed origins for CORS
// These domains can make cross-origin requests to our API
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

/**
 * Check if an origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
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

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-WAiK-Proxy",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  }
  
  // Only set Allow-Origin if the origin is allowed
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  
  return headers
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreFlight(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  const headers = getCorsHeaders(origin)
  
  return new NextResponse(null, {
    status: 204,
    headers,
  })
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  const headers = getCorsHeaders(origin)
  
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  
  return response
}

/**
 * Wrap an API handler to add CORS support
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   return withCors(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ data: "..." })
 *   })
 * }
 */
export async function withCors(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const origin = request.headers.get("origin")
  
  // Handle preflight
  if (request.method === "OPTIONS") {
    return handleCorsPreFlight(request)
  }
  
  // Run the actual handler
  const response = await handler()
  
  // Add CORS headers to response
  return addCorsHeaders(response, origin)
}

