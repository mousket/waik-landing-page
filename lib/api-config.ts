/**
 * API Configuration for WAiK
 * 
 * This module handles API base URL detection to allow external frontends
 * (like V0 by Vercel) to connect to the centralized backend at waik-demo-vercel.app
 * 
 * Logic:
 * - localhost / 127.0.0.1 → Use local API (relative URLs)
 * - waik-demo-vercel.app → Use local API (it IS the backend)
 * - Any other domain → Proxy to waik-demo-vercel.app
 */

// The canonical backend URL
export const WAIK_BACKEND_URL = "https://waik-demo-vercel.app"

// Domains that should use local/relative API paths
const LOCAL_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "waik-demo-vercel.app",
  "waik-demo.vercel.app", // Alternative subdomain pattern
]

/**
 * Check if we're running on a domain that hosts the backend
 */
function isLocalBackend(): boolean {
  // Server-side rendering - always use relative URLs
  if (typeof window === "undefined") {
    return true
  }

  const hostname = window.location.hostname

  // Check if hostname matches any local domain
  return LOCAL_DOMAINS.some((domain) => {
    // Exact match or subdomain match
    return hostname === domain || hostname.endsWith(`.${domain}`)
  })
}

/**
 * Get the API base URL based on current environment
 * 
 * @returns Empty string for local, or the full backend URL for external
 * 
 * @example
 * // On localhost:3000
 * getApiBaseUrl() // Returns ""
 * fetch(`${getApiBaseUrl()}/api/incidents`) // → /api/incidents
 * 
 * @example
 * // On v0-preview-123.vercel.app
 * getApiBaseUrl() // Returns "https://waik-demo-vercel.app"
 * fetch(`${getApiBaseUrl()}/api/incidents`) // → https://waik-demo-vercel.app/api/incidents
 */
export function getApiBaseUrl(): string {
  if (isLocalBackend()) {
    return ""
  }
  return WAIK_BACKEND_URL
}

/**
 * Build a full API URL
 * 
 * @param path - The API path (should start with /api/)
 * @returns Full URL ready for fetch
 * 
 * @example
 * apiUrl("/api/incidents") // → "/api/incidents" or "https://waik-demo-vercel.app/api/incidents"
 */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  
  return `${base}${normalizedPath}`
}

/**
 * Enhanced fetch that automatically uses the correct API base URL
 * and includes credentials for cross-origin requests
 * 
 * @param path - The API path (should start with /api/)
 * @param options - Standard fetch options
 * @returns Promise<Response>
 * 
 * @example
 * const response = await apiFetch("/api/incidents")
 * const data = await response.json()
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = apiUrl(path)
  const isExternal = !isLocalBackend()

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }

  // For cross-origin requests, we might need credentials
  if (isExternal) {
    fetchOptions.credentials = "include"
    // Add a header so the backend knows this is a proxy request
    fetchOptions.headers = {
      ...fetchOptions.headers,
      "X-WAiK-Proxy": "true",
    }
  }

  return fetch(url, fetchOptions)
}

/**
 * Check if we're in a proxied environment (not on the main backend)
 */
export function isProxiedEnvironment(): boolean {
  return !isLocalBackend()
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo(): {
  hostname: string
  isLocal: boolean
  apiBaseUrl: string
} {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "server"
  return {
    hostname,
    isLocal: isLocalBackend(),
    apiBaseUrl: getApiBaseUrl(),
  }
}

