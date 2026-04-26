/**
 * Best-effort message from a failed `fetch` Response (JSON `error` or status-based text).
 */
export async function readApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<{ message: string; code?: string }> {
  let text = ""
  try {
    text = await res.clone().text()
  } catch {
    return { message: statusFallback(res.status, fallback) }
  }
  if (text) {
    try {
      const j = JSON.parse(text) as { error?: string; code?: string }
      if (typeof j.error === "string" && j.error.trim()) {
        return { message: j.error.trim(), code: typeof j.code === "string" ? j.code : undefined }
      }
    } catch {
      if (text.trim().length < 200) {
        return { message: text.trim() }
      }
    }
  }
  return { message: statusFallback(res.status, fallback) }
}

function statusFallback(status: number, fallback: string): string {
  if (status === 401) return "Session expired or you are not signed in. Try refreshing the page."
  if (status === 403) {
    return "You do not have access to this data, or a password change is required."
  }
  if (status === 404) return "The requested facility was not found or is inactive."
  if (status === 400) return "The request is missing a valid facility or organization scope."
  if (status >= 500) return "The server had a problem loading this data. Please try again."
  return fallback
}
