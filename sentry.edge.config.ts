import * as Sentry from "@sentry/nextjs"

import { scrubSentryBreadcrumb, scrubSentryEvent } from "@/lib/sentry-scrub"

const dsn = process.env.SENTRY_DSN?.trim()

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0"),
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
})
