import type { Breadcrumb, Event } from "@sentry/nextjs"

/** Keys that may hold PHI or long clinical strings — redact from Sentry payloads. */
export const SENTRY_PHI_KEYS = new Set([
  "narrative",
  "description",
  "statement",
  "answerText",
  "questionText",
  "residentName",
  "firstName",
  "lastName",
  "content",
  "rawTranscript",
  "enhancedNarrative",
  "residentStatement",
  "declaration",
  "transcript",
  "clinicalRecord",
  "fullNarrative",
  "answer",
  "question",
  "prompt",
  "completion",
  "messages",
  "body",
])

function keyLooksSensitive(key: string): boolean {
  if (SENTRY_PHI_KEYS.has(key)) return true
  const k = key.toLowerCase()
  return (
    k.includes("narrative") ||
    k.includes("transcript") ||
    k.includes("questiontext") ||
    k.includes("answertext") ||
    k.endsWith("statement") ||
    k.includes("clinicalrecord") ||
    k === "text"
  )
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null) return value
  if (typeof value === "string") {
    if (value.length > 400) return `${value.slice(0, 120)}…[truncated]`
    return value
  }
  if (typeof value !== "object") return value
  if (seen.has(value as object)) return "[circular]"
  seen.add(value as object)
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, seen))
  }
  const o = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(o)) {
    if (keyLooksSensitive(key)) {
      out[key] = "[redacted]"
      continue
    }
    out[key] = redactValue(o[key], seen)
  }
  return out
}

/**
 * `beforeSend`: remove / truncate fields that could carry PHI or long clinical text.
 */
export function scrubSentryEvent(event: Event): Event | null {
  try {
    const seen = new WeakSet<object>()

    if (event.extra) {
      event.extra = redactValue(event.extra, seen) as Record<string, unknown>
    }
    if (event.contexts) {
      for (const k of Object.keys(event.contexts)) {
        const ctx = event.contexts[k]
        event.contexts[k] = redactValue(ctx, seen) as Record<string, unknown>
      }
    }
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        const nb = { ...b }
        if (nb.data) nb.data = redactValue(nb.data, seen) as Record<string, unknown>
        if (typeof nb.message === "string" && nb.message.length > 400) {
          nb.message = `${nb.message.slice(0, 200)}…[truncated]`
        }
        return nb
      })
    }

    if (event.request?.data) {
      event.request.data = redactValue(event.request.data, seen)
    }

    return event
  } catch {
    return event
  }
}

/** Scrub breadcrumb payloads before they are stored on the event. */
export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  try {
    const seen = new WeakSet<object>()
    if (breadcrumb.data) {
      return {
        ...breadcrumb,
        data: redactValue(breadcrumb.data, seen) as Record<string, unknown>,
      }
    }
    return breadcrumb
  } catch {
    return breadcrumb
  }
}
