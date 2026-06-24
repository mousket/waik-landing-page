/** Staff report entry with optional admin facility scope (super admin acting in a community). */
export function buildStaffReportHref(opts?: {
  facilityId?: string
  organizationId?: string
}): string {
  const sp = new URLSearchParams()
  const facilityId = (opts?.facilityId ?? "").trim()
  const organizationId = (opts?.organizationId ?? "").trim()
  if (facilityId) sp.set("facilityId", facilityId)
  if (organizationId) sp.set("organizationId", organizationId)
  const q = sp.toString()
  return q ? `/staff/report?${q}` : "/staff/report"
}
