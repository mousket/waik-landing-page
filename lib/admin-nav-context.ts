import {
  getEffectiveFacilityIdForApi,
  getEffectiveOrganizationIdForApi,
} from "@/lib/admin-session-scope"

/**
 * Builds `/api/incidents?...` with admin facility/org params plus other query keys (e.g. `phase`).
 */
export function buildAdminIncidentsApiPath(
  searchParams: URLSearchParams,
  extra: Record<string, string>,
): string {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(extra)) s.set(k, v)
  const facilityId = getEffectiveFacilityIdForApi(searchParams)
  const organizationId = getEffectiveOrganizationIdForApi(searchParams)
  if (facilityId?.trim()) s.set("facilityId", facilityId.trim())
  if (organizationId?.trim()) s.set("organizationId", organizationId.trim())
  const q = s.toString()
  return q ? `/api/incidents?${q}` : "/api/incidents"
}

/**
 * Query string for API calls that must match the current admin `facilityId` / `organizationId` (e.g. `?facilityId=x&organizationId=y`).
 */
export function getAdminContextQueryString(searchParams: URLSearchParams): string {
  const sp = new URLSearchParams()
  const facilityId = getEffectiveFacilityIdForApi(searchParams)
  const organizationId = getEffectiveOrganizationIdForApi(searchParams)
  if (facilityId?.trim()) sp.set("facilityId", facilityId.trim())
  if (organizationId?.trim()) sp.set("organizationId", organizationId.trim())
  const q = sp.toString()
  return q ? `?${q}` : ""
}

/**
 * Preserves admin facility + org context when moving between /admin/* routes.
 */
export function buildAdminPathWithContext(path: string, searchParams: URLSearchParams): string {
  const sp = new URLSearchParams()
  const facilityId = getEffectiveFacilityIdForApi(searchParams)
  const organizationId = getEffectiveOrganizationIdForApi(searchParams)
  if (facilityId?.trim()) sp.set("facilityId", facilityId.trim())
  if (organizationId?.trim()) sp.set("organizationId", organizationId.trim())
  const q = sp.toString()
  if (!q) return path
  return path.includes("?") ? `${path}&${q}` : `${path}?${q}`
}

type EffectiveScope = {
  searchParams: URLSearchParams
  stateFacilityId?: string
  userDefaultFacilityId?: string
}

/**
 * Merges URL, React state, and the signed-in user’s home facility.
 * Use this for every admin `/api/*` call: waik super-admins require a `facilityId` in the
 * request, and `state` can briefly lag the address bar right after load or navigation.
 */
export function getEffectiveAdminFacilityId(opts: EffectiveScope): string | undefined {
  const fromState = (opts.stateFacilityId || "").trim()
  const fromQueryOrSession = getEffectiveFacilityIdForApi(opts.searchParams)
  const fromUser = (opts.userDefaultFacilityId || "").trim()
  return fromState || fromQueryOrSession || fromUser || undefined
}

export function getEffectiveAdminOrganizationId(opts: EffectiveScope): string | undefined {
  return getEffectiveOrganizationIdForApi(opts.searchParams) || undefined
}
