import * as Sentry from "@sentry/nextjs"

import { scrubSentryBreadcrumb, scrubSentryEvent } from "@/lib/sentry-scrub"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0"),
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
