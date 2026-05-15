import { computeTrendsPeriodWindows, parseTrendsRangeParam, type TrendsRangeKey } from "@/lib/admin/trends-range"
import { RISK_DRIVER_LABEL, type RiskDriverKey } from "@/lib/types/trends-high-risk-cohort"

const DRIVER_KEYS = new Set(Object.keys(RISK_DRIVER_LABEL) as RiskDriverKey[])

export function parseRiskDriverParam(value: string | null | undefined): RiskDriverKey | null {
  const s = (value || "").trim().toLowerCase()
  if (!s || !DRIVER_KEYS.has(s as RiskDriverKey)) return null
  return s as RiskDriverKey
}

export type ParsedAdminResidentsTrendsDrilldown = {
  trendsRange: TrendsRangeKey
  riskHigh: boolean
  driver: RiskDriverKey | null
}

/**
 * Trends drilldown params for `/admin/residents` (Phase 5c-2 map).
 */
export function parseAdminResidentsTrendsDrilldown(searchParams: URLSearchParams): ParsedAdminResidentsTrendsDrilldown {
  const riskRaw = (searchParams.get("risk") || "").trim().toLowerCase()
  return {
    trendsRange: parseTrendsRangeParam(searchParams.get("range")),
    riskHigh: riskRaw === "high",
    driver: parseRiskDriverParam(searchParams.get("driver")),
  }
}

export function adminResidentsUrlHasTrendsDrilldown(searchParams: URLSearchParams): boolean {
  const r = parseAdminResidentsTrendsDrilldown(searchParams)
  return r.riskHigh || Boolean(r.driver)
}

/** Current trends window for client-side incident filtering. */
export function residentsTrendsCurrentWindow(searchParams: URLSearchParams) {
  const { trendsRange } = parseAdminResidentsTrendsDrilldown(searchParams)
  return computeTrendsPeriodWindows(new Date(), trendsRange).current
}
