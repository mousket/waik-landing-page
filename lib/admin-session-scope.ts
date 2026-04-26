const SESSION_SCOPE = "waik:admin:facilityOrgScope"

export type AdminPersistedScope = { facilityId: string; organizationId: string }

export function readAdminScopeFromSession(): AdminPersistedScope | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_SCOPE)
    if (!raw) return null
    const j = JSON.parse(raw) as { facilityId?: string; organizationId?: string }
    const facilityId = (j.facilityId || "").trim()
    const organizationId = (j.organizationId || "").trim()
    if (!facilityId) return null
    return { facilityId, organizationId: organizationId || "" }
  } catch {
    return null
  }
}

export function writeAdminScopeToSession(scope: AdminPersistedScope): void {
  try {
    sessionStorage.setItem(SESSION_SCOPE, JSON.stringify(scope))
  } catch {
    // ignore
  }
}

/**
 * Merges bar query (from `useAdminUrlSearchParams`) with last known session scope, so
 * `fetch` includes `facilityId` even on the one frame the bar string is not yet in React state.
 */
export function getEffectiveFacilityIdForApi(sp: URLSearchParams): string | undefined {
  const u = (sp.get("facilityId") || "").trim()
  if (u) return u
  return readAdminScopeFromSession()?.facilityId || undefined
}

export function getEffectiveOrganizationIdForApi(sp: URLSearchParams): string | undefined {
  const u = (sp.get("organizationId") || "").trim()
  if (u) return u
  return readAdminScopeFromSession()?.organizationId || undefined
}
