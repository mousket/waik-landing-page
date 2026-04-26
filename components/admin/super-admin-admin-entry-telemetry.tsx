"use client"

import { useEffect, useRef } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"

/**
 * When a WAiK super admin uses an org-scoped admin URL (?organizationId=...),
 * records one server log per distinct org+facility pair as the URL stabilizes
 * (facility may be filled in after auto-select).
 */
export function SuperAdminAdminEntryTelemetry({ isWaikSuperAdmin }: { isWaikSuperAdmin: boolean }) {
  const searchParams = useAdminUrlSearchParams()
  const lastLogged = useRef<string | null>(null)

  const organizationId = (searchParams.get("organizationId") || "").trim()
  const facilityId = (searchParams.get("facilityId") || "").trim()

  useEffect(() => {
    if (!isWaikSuperAdmin || !organizationId) return

    const key = `${organizationId}::${facilityId || ""}`
    if (lastLogged.current === key) return
    lastLogged.current = key

    void fetch("/api/telemetry/super-admin-admin-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        organizationId,
        ...(facilityId ? { facilityId } : {}),
      }),
    }).catch(() => {
      // Non-blocking; server may be unreachable offline
    })
  }, [isWaikSuperAdmin, organizationId, facilityId])

  return null
}
