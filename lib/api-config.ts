export const API_BASE_URL = "https://waik-demo-vercel.app"

// Helper function to construct API URLs
export function apiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path
  return `${API_BASE_URL}/${cleanPath}`
}
