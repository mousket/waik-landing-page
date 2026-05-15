import { describe, it, expect } from "vitest"
import {
  adminIncidentsUrlHasDrilldownParams,
  parseAdminIncidentsUrl,
} from "@/lib/admin/parse-admin-incidents-url"
import {
  trendsIncidentsListHref,
  trendsResidentsHighRiskHref,
} from "@/lib/admin/trends-drilldowns"
import { buildTrendsSnapshotPayload } from "@/lib/admin/build-trends-snapshot"
import type { TrendsIncidentPool } from "@/lib/admin/load-trends-incident-pool"
import { computeTrendsPeriodWindows } from "@/lib/admin/trends-range"

describe("Trends drilldown URL parity", () => {
  const ctx = new URLSearchParams("facilityId=fac-1&organizationId=org-1")

  it("parses range, type, severity, repeat, unit, role, bottleneck", () => {
    const p = parseAdminIncidentsUrl(
      new URLSearchParams("range=30d&type=fall&severity=critical&repeat=1&unit=WingA&role=rn&bottleneck=missing_info"),
    )
    expect(p.trendTypeBucket).toBe("fall")
    expect(p.severity).toBe("critical")
    expect(p.repeatOnly).toBe(true)
    expect(p.unit).toBe("WingA")
    expect(p.role).toBe("rn")
    expect(p.bottleneck).toBe("missing_info")
    expect(p.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("detects drilldown params on incidents list", () => {
    expect(adminIncidentsUrlHasDrilldownParams(new URLSearchParams("range=7d"))).toBe(true)
    expect(adminIncidentsUrlHasDrilldownParams(new URLSearchParams())).toBe(false)
  })

  it("builds incidents hrefs with admin context preserved", () => {
    const href = trendsIncidentsListHref(ctx, "30d", {
      type: "fall",
      severity: "critical",
      repeat: true,
      bottleneck: "overdue_docs",
    })
    expect(href).toContain("/admin/incidents?")
    expect(href).toContain("facilityId=fac-1")
    expect(href).toContain("range=30d")
    expect(href).toContain("type=fall")
    expect(href).toContain("severity=critical")
    expect(href).toContain("repeat=1")
    expect(href).toContain("bottleneck=overdue_docs")
  })

  it("builds residents high-risk href with optional driver", () => {
    const base = trendsResidentsHighRiskHref(ctx, "90d")
    expect(base).toContain("/admin/residents?")
    expect(base).toContain("risk=high")
    expect(base).toContain("range=90d")
    const withDriver = trendsResidentsHighRiskHref(ctx, "90d", "repeat_falls")
    expect(withDriver).toContain("driver=repeat_falls")
  })
})

describe("Trends snapshot envelope", () => {
  it("includes all card sections for Executive View", () => {
    const now = new Date("2026-05-15T12:00:00.000Z")
    const { current, previous } = computeTrendsPeriodWindows(now, "7d")
    const pool: TrendsIncidentPool = {
      incidents: [],
      current,
      previous,
      range: "7d",
      nowMs: now.getTime(),
    }
    const payload = buildTrendsSnapshotPayload("fac-1", pool, now.toISOString())
    expect(payload.schemaVersion).toBe(1)
    expect(payload.facilityHealth).toBeDefined()
    expect(payload.incidentTrends).toBeDefined()
    expect(payload.complianceDrift).toBeDefined()
    expect(payload.patternInsights).toBeDefined()
    expect(payload.highRiskCohort).toBeDefined()
    expect(payload.interventionEffectiveness).toBeDefined()
    expect(payload.staffingThroughput).toBeDefined()
    expect(payload.weeklyBrief.sections.length).toBe(4)
  })
})
