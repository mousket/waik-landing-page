/**
 * Super-admin / product telemetry: always logs a grep-friendly line, optionally POSTs to a URL.
 * Phase 3e task-08g — see .env.example (WAIK_TELEMETRY_HTTP_*).
 */
export function emitWaikTelemetry(payload: Record<string, unknown>): void {
  const line = JSON.stringify(payload)
  console.info("[WAiK_TELEMETRY]", line)

  const url = process.env.WAIK_TELEMETRY_HTTP_URL?.trim()
  if (!url) return

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const bearer = process.env.WAIK_TELEMETRY_HTTP_BEARER_TOKEN?.trim()
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`
  }
  const customHeader = process.env.WAIK_TELEMETRY_HTTP_HEADER_NAME?.trim()
  const customValue = process.env.WAIK_TELEMETRY_HTTP_HEADER_VALUE?.trim()
  if (customHeader && customValue) {
    headers[customHeader] = customValue
  }

  void fetch(url, { method: "POST", headers, body: line }).then(
    (res) => {
      if (!res.ok) {
        console.warn("[WAiK_TELEMETRY] http sink non-OK:", res.status)
      }
    },
    (e: unknown) => {
      console.warn("[WAiK_TELEMETRY] http sink failed:", e instanceof Error ? e.message : String(e))
    },
  )
}
