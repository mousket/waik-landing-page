"use client"

import * as Sentry from "@sentry/nextjs"
import NextError from "next/error"
import { useEffect } from "react"

/**
 * App Router root error boundary — reports to Sentry (with PHI scrubbing from SDK `beforeSend`).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
