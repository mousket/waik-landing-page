import { subDays } from "date-fns"

/**
 * Pattern stats for a single resident. Uses `startedAt` (Phase 1 start or created) per incident.
 * All workflow phases (including open Phase 1 and closed) count — we care about report volume, not closure.
 */
export type ResidentIncidentRow = { startedAt: string; incidentType: string; id: string }

export function incidentPatternFromRows(
  rows: ResidentIncidentRow[],
  now: Date = new Date(),
): {
  count30: number
  count90: number
  count180: number
  byType30: Record<string, number>
  /** Task 09: flag repeat pattern in last 30 days */
  alertRepeat30: boolean
} {
  const d30 = subDays(now, 30)
  const d90 = subDays(now, 90)
  const d180 = subDays(now, 180)

  const t = (iso: string) => new Date(iso).getTime()
  const inWin = (iso: string, from: Date) => t(iso) >= from.getTime()

  const in30 = rows.filter((r) => inWin(r.startedAt, d30))
  const in90 = rows.filter((r) => inWin(r.startedAt, d90))
  const in180 = rows.filter((r) => inWin(r.startedAt, d180))

  const byType30: Record<string, number> = {}
  for (const r of in30) {
    const k = r.incidentType || "Unknown"
    byType30[k] = (byType30[k] ?? 0) + 1
  }

  return {
    count30: in30.length,
    count90: in90.length,
    count180: in180.length,
    byType30,
    alertRepeat30: in30.length >= 3,
  }
}
