"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { toast } from "sonner"
import { DashboardOnboarding } from "@/components/dashboard-onboarding"
import { ActiveInvestigationsTab } from "@/components/admin/active-investigations-tab"
import { ClosedInvestigationsTab } from "@/components/admin/closed-incidents-tab"
import { AdminFacilitySwitcher } from "@/components/admin/admin-facility-switcher"
import { AdminCommandHeaderCard } from "@/components/admin/admin-command-header-card"
import { AdminDocumentationHealthCard } from "@/components/admin/admin-documentation-health-card"
import { AdminHighRiskResidentsCard } from "@/components/admin/admin-high-risk-residents-card"
import { AdminHighestRiskHeroCard } from "@/components/admin/admin-highest-risk-hero-card"
import { AdminIncidentPulseTodayCard } from "@/components/admin/admin-incident-pulse-today-card"
import { AdminStaffThroughputCard } from "@/components/admin/admin-staff-throughput-card"
import { AdminNeedsAttentionTodayCard } from "@/components/admin/admin-needs-attention-today-card"
import { AdminTrendsView } from "@/components/admin/admin-trends-view"
import { AdminTrendsWeeklyBriefPanel } from "@/components/admin/admin-trends-weekly-brief-panel"
import { TrendsSnapshotProvider } from "@/components/admin/trends-snapshot-provider"
import { AdminDashboardLiveDataNotice } from "@/components/admin/admin-dashboard-live-data-notice"
import { DailyBriefPanel, dismissStorageKey, type DailyBriefApiPayload } from "@/components/admin/daily-brief"
import { NeedsAttentionTab } from "@/components/admin/needs-attention-tab"
import { StatsSidebar } from "@/components/admin/stats-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseTrendsRangeParam, type TrendsRangeKey } from "@/lib/admin/trends-range"
import { getEffectiveAdminFacilityId, getEffectiveAdminOrganizationId } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
import { cn } from "@/lib/utils"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"

const RED = "#C0392B"

const INCIDENT_PHASES_QUERY = "phase=phase_1_in_progress,phase_1_complete,phase_2_in_progress"

function buildIncidentsUrl(facilityId?: string, organizationId?: string) {
  const q = facilityId?.trim() ? `&facilityId=${encodeURIComponent(facilityId.trim())}` : ""
  const o = organizationId?.trim() ? `&organizationId=${encodeURIComponent(organizationId.trim())}` : ""
  return `/api/incidents?${INCIDENT_PHASES_QUERY}${q}${o}`
}

function applyFacilityIdToPath(
  router: { replace: (url: string, opts?: { scroll?: boolean }) => void },
  pathname: string,
  current: Readonly<URLSearchParams> | { toString: () => string },
  facilityId: string,
) {
  const sp = new URLSearchParams(current.toString())
  sp.set("facilityId", facilityId)
  const q = sp.toString()
  router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
}

const DASHBOARD_VIEW_TRIGGER_CLASS =
  "shrink-0 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"

function isValidTrendsRangeQuery(raw: string | null): raw is TrendsRangeKey {
  const v = (raw || "").trim().toLowerCase()
  return v === "7d" || v === "30d" || v === "90d"
}

export function AdminDashboardShell({
  canAccessPhase2,
  userDisplayName,
  defaultFacilityId,
}: {
  canAccessPhase2: boolean
  userDisplayName: string
  /** Default facility (from user record) if none selected yet. */
  defaultFacilityId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useAdminUrlSearchParams()

  const facilityIdFromUrl = (searchParams.get("facilityId") || "").trim() || undefined
  const [facilityId, setFacilityId] = useState<string | undefined>(
    () => (facilityIdFromUrl ?? (defaultFacilityId || "").trim()) || undefined,
  )
  const [attentionCount, setAttentionCount] = useState<number | null>(null)
  const [activePhase2Count, setActivePhase2Count] = useState<number | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsListError, setIncidentsListError] = useState<string | null>(null)
  const [scopeHealthLine, setScopeHealthLine] = useState<string | null>(null)
  const [scopeCheckError, setScopeCheckError] = useState<string | null>(null)
  const incidentsFirstLoad = useRef(true)
  const [briefDismissed, setBriefDismissed] = useState(false)
  const [briefPayload, setBriefPayload] = useState<DailyBriefApiPayload | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [liveDataRetrying, setLiveDataRetrying] = useState(false)

  const effectiveFacilityId = useMemo(
    () =>
      getEffectiveAdminFacilityId({
        searchParams,
        stateFacilityId: facilityId,
        userDefaultFacilityId: defaultFacilityId,
      }),
    [searchParams, facilityId, defaultFacilityId],
  )

  const effectiveOrgId = useMemo(
    () =>
      getEffectiveAdminOrganizationId({
        searchParams,
        stateFacilityId: facilityId,
        userDefaultFacilityId: defaultFacilityId,
      }),
    [searchParams, facilityId, defaultFacilityId],
  )

  /** Daily Command (default) vs Executive Trends (`?view=trends`, Phase 5c-2). */
  const dashboardView = useMemo(() => {
    const raw = (searchParams.get("view") || "").trim().toLowerCase()
    return raw === "trends" ? "trends" : "today"
  }, [searchParams])

  const trendsRange = useMemo(
    () => parseTrendsRangeParam(searchParams.get("range")),
    [searchParams],
  )

  const setDashboardView = useCallback(
    (next: "today" | "trends") => {
      const sp = new URLSearchParams(searchParams.toString())
      if (next === "today") {
        sp.delete("view")
        sp.delete("range")
      } else {
        sp.set("view", "trends")
        if (!isValidTrendsRangeQuery(sp.get("range"))) {
          sp.set("range", "30d")
        }
      }
      const q = sp.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setTrendsRange = useCallback(
    (next: TrendsRangeKey) => {
      const sp = new URLSearchParams(searchParams.toString())
      sp.set("view", "trends")
      sp.set("range", next)
      const q = sp.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    if (dashboardView !== "trends") return
    const raw = searchParams.get("range")
    if (isValidTrendsRangeQuery(raw)) return
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("view", "trends")
    sp.set("range", "30d")
    const q = sp.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [dashboardView, pathname, router, searchParams])

  useEffect(() => {
    try {
      if (window.localStorage.getItem(dismissStorageKey())) {
        setBriefDismissed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const dismissBrief = useCallback(() => {
    try {
      window.localStorage.setItem(dismissStorageKey(), "1")
    } catch {
      // ignore
    }
    setBriefDismissed(true)
  }, [])

  const scrollToDailyBrief = useCallback(() => {
    document.getElementById("daily-brief")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const scrollToWeeklyBrief = useCallback(() => {
    document.getElementById("trends-weekly-brief")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  useEffect(() => {
    if (!effectiveFacilityId) {
      setBriefPayload(null)
      setBriefError(null)
      setBriefLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setBriefLoading(true)
      setBriefError(null)
      const sp = new URLSearchParams()
      sp.set("facilityId", effectiveFacilityId)
      if (effectiveOrgId) sp.set("organizationId", effectiveOrgId)
      try {
        const res = await fetch(`/api/admin/daily-brief?${sp.toString()}`, { credentials: "include" })
        if (cancelled) return
        if (!res.ok) {
          const { message } = await readApiErrorMessage(res, "Could not load daily brief")
          setBriefError(message)
          setBriefPayload(null)
          return
        }
        const data = (await res.json()) as {
          text?: string
          generatedAt?: string
          facilityId?: string
          error?: string
        }
        if (data.error) {
          setBriefError(typeof data.error === "string" ? data.error : "Daily brief unavailable.")
          setBriefPayload(null)
          return
        }
        if (data.text != null && data.generatedAt) {
          setBriefPayload({
            text: data.text,
            generatedAt: data.generatedAt,
            facilityId: data.facilityId,
          })
          setBriefError(null)
        } else {
          setBriefError("Daily brief response was incomplete.")
          setBriefPayload(null)
        }
      } catch {
        if (!cancelled) {
          setBriefError("Network error while loading daily brief.")
          setBriefPayload(null)
        }
      } finally {
        if (!cancelled) setBriefLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [effectiveFacilityId, effectiveOrgId])

  // Keep address bar in sync with a known home facility so child links and APIs that read
  // `searchParams` (and super-admin `resolveEffectiveAdminFacility` which requires a facilityId)
  // all see the same id as the parent fetch.
  useEffect(() => {
    if (facilityIdFromUrl) return
    const d = (defaultFacilityId || "").trim()
    if (!d) return
    if (pathname !== "/admin/dashboard") return
    applyFacilityIdToPath(router, pathname, searchParams, d)
  }, [defaultFacilityId, facilityIdFromUrl, pathname, router, searchParams])

  // Keep `facilityId` in sync with URL + localStorage, and auto-pick a sensible default. On the
  // dashboard, the facility picker sits beside the Command center; on other admin routes it is in
  // the app shell. This component only holds id for API/query consistency.
  useEffect(() => {
    const fromUrl = facilityIdFromUrl
    if (fromUrl) {
      setFacilityId(fromUrl)
      try {
        window.localStorage.setItem("waik:admin:facilityId", fromUrl)
      } catch {
        // ignore
      }
      return
    }

    let fromStorage: string | undefined
    try {
      const raw = window.localStorage.getItem("waik:admin:facilityId")
      fromStorage = raw?.trim() ? raw.trim() : undefined
    } catch {
      fromStorage = undefined
    }

    const fromDefault = (defaultFacilityId || "").trim() || undefined
    const candidate = fromStorage ?? fromDefault
    if (!candidate) {
      setFacilityId(undefined)
      return
    }

    setFacilityId(candidate)
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("facilityId", candidate)
    router.replace(`${pathname}?${sp.toString()}`)
  }, [defaultFacilityId, facilityIdFromUrl, pathname, router, searchParams])

  const loadIncidents = useCallback(async (opts?: { showLoading?: boolean }) => {
    const isFirst = incidentsFirstLoad.current
    const showLoading = opts?.showLoading === true || isFirst
    if (showLoading) setIncidentsLoading(true)
    const fac = getEffectiveAdminFacilityId({
      searchParams,
      stateFacilityId: facilityId,
      userDefaultFacilityId: defaultFacilityId,
    })
    const org = getEffectiveAdminOrganizationId({
      searchParams,
      stateFacilityId: facilityId,
      userDefaultFacilityId: defaultFacilityId,
    })
    try {
      const res = await fetch(buildIncidentsUrl(fac, org), { credentials: "include" })
      if (!res.ok) {
        const { message, code } = await readApiErrorMessage(res, "Could not load incidents")
        setIncidentsListError(message)
        setIncidents([])
        if (code === "must_change_password") {
          toast.error("Password change required before data can load.")
        }
        return
      }
      setIncidentsListError(null)
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      const msg = "Network error while loading incidents."
      setIncidentsListError(msg)
      setIncidents([])
    } finally {
      if (isFirst) {
        incidentsFirstLoad.current = false
      }
      if (showLoading) {
        setIncidentsLoading(false)
      }
    }
  }, [defaultFacilityId, facilityId, searchParams])

  const loadDashboardStats = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false
      if (showLoading) setStatsLoading(true)
      const fac = getEffectiveAdminFacilityId({
        searchParams,
        stateFacilityId: facilityId,
        userDefaultFacilityId: defaultFacilityId,
      })
      const org = getEffectiveAdminOrganizationId({
        searchParams,
        stateFacilityId: facilityId,
        userDefaultFacilityId: defaultFacilityId,
      })
      if (!fac) {
        setStats(null)
        setStatsError(null)
        setStatsLoading(false)
        return
      }
      try {
        const sp = new URLSearchParams()
        sp.set("facilityId", fac)
        if (org) sp.set("organizationId", org)
        const q = sp.toString() ? `?${sp.toString()}` : ""
        const res = await fetch(`/api/admin/dashboard-stats${q}`, { credentials: "include" })
        if (!res.ok) {
          const { message } = await readApiErrorMessage(res, "Could not load dashboard stats")
          throw new Error(message)
        }
        const data = (await res.json()) as DashboardStats
        setStats(data)
        setStatsError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load dashboard stats"
        setStats(null)
        setStatsError(msg)
      } finally {
        if (showLoading) setStatsLoading(false)
      }
    },
    [defaultFacilityId, facilityId, searchParams],
  )

  const retryLiveDashboardData = useCallback(async () => {
    setLiveDataRetrying(true)
    try {
      await Promise.all([loadIncidents({ showLoading: true }), loadDashboardStats({ showLoading: true })])
    } finally {
      setLiveDataRetrying(false)
    }
  }, [loadDashboardStats, loadIncidents])

  useEffect(() => {
    if (!effectiveFacilityId) {
      setIncidentsListError(null)
      setScopeHealthLine(null)
      setScopeCheckError(null)
      if (incidentsFirstLoad.current) {
        incidentsFirstLoad.current = false
        setIncidentsLoading(false)
      }
      return
    }
    void loadIncidents()
    const id = window.setInterval(() => void loadIncidents(), 60_000)
    return () => window.clearInterval(id)
  }, [effectiveFacilityId, loadIncidents])

  useEffect(() => {
    if (!effectiveFacilityId) {
      setScopeHealthLine(null)
      setScopeCheckError(null)
      return
    }
    let cancelled = false
    const sp = new URLSearchParams()
    sp.set("facilityId", effectiveFacilityId)
    if (effectiveOrgId) sp.set("organizationId", effectiveOrgId)
    void (async () => {
      try {
        const res = await fetch(`/api/admin/scope-snapshot?${sp.toString()}`, { credentials: "include" })
        if (cancelled) return
        if (!res.ok) {
          const { message } = await readApiErrorMessage(res, "Could not verify database scope")
          setScopeCheckError(message)
          setScopeHealthLine(null)
          return
        }
        setScopeCheckError(null)
        const data = (await res.json()) as {
          counts?: { openPipeline: number; closedLast30Days: number; allTimeInFacility: number }
        }
        if (data.counts) {
          const c = data.counts
          setScopeHealthLine(
            `Data for this facility in the database: ${c.openPipeline} in open phases, ${c.closedLast30Days} closed in the last 30 days, ${c.allTimeInFacility} total records.`,
          )
        } else {
          setScopeHealthLine(null)
        }
      } catch {
        if (!cancelled) {
          setScopeCheckError("Could not reach the server to verify this facility's data.")
          setScopeHealthLine(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [effectiveFacilityId, effectiveOrgId])

  const onAttentionCount = useCallback((n: number) => {
    setAttentionCount(n)
  }, [])

  const onActiveCount = useCallback((n: number) => {
    setActivePhase2Count(n)
  }, [])

  useEffect(() => {
    void loadDashboardStats()
  }, [loadDashboardStats])

  const mainColumn = (
    <div className="min-h-0 min-w-0 flex-1 space-y-6">
      <Tabs
        value={dashboardView}
        onValueChange={(v) => {
          if (v === "today" || v === "trends") setDashboardView(v)
        }}
        className="flex min-h-0 w-full flex-col gap-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {dashboardView === "trends" ? "Executive view" : "Daily Command"}
            </h1>
            {effectiveFacilityId && !briefDismissed && dashboardView === "today" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 self-start rounded-xl border-border/60 text-xs font-semibold lg:hidden"
                onClick={scrollToDailyBrief}
              >
                View brief
              </Button>
            ) : null}
            {effectiveFacilityId && dashboardView === "trends" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 self-start rounded-xl border-border/60 text-xs font-semibold lg:hidden"
                onClick={scrollToWeeklyBrief}
              >
                View brief
              </Button>
            ) : null}
          </div>
          <TabsList className="mb-0 flex h-auto min-h-10 w-full max-w-full flex-nowrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-11 sm:w-auto sm:justify-center sm:gap-2 sm:p-2">
            <TabsTrigger value="today" className={DASHBOARD_VIEW_TRIGGER_CLASS}>
              Today
            </TabsTrigger>
            <TabsTrigger value="trends" className={DASHBOARD_VIEW_TRIGGER_CLASS}>
              Trends
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="mt-0 min-h-0 flex flex-col space-y-6 outline-none data-[state=inactive]:hidden">
          <section id="dc-a1" className="scroll-mt-24 flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <AdminCommandHeaderCard
                userDisplayName={userDisplayName}
                effectiveFacilityId={effectiveFacilityId}
                incidents={incidents}
                incidentsLoading={incidentsLoading}
                snapshotError={incidentsListError}
                stats={stats}
                statsLoading={statsLoading}
                statsFetchError={statsError}
                searchParams={searchParams}
                scopeHealthLine={scopeHealthLine}
              />
            </div>
            <div className="w-full min-w-0 shrink-0 lg:max-w-sm xl:max-w-md">
              <AdminFacilitySwitcher defaultFacilityId={defaultFacilityId} layout="dashboardInline" />
            </div>
          </section>
          {incidentsListError || statsError ? (
            <AdminDashboardLiveDataNotice
              incidentsError={incidentsListError}
              statsError={statsError}
              effectiveFacilityId={effectiveFacilityId}
              onRetry={() => void retryLiveDashboardData()}
              retrying={liveDataRetrying}
            />
          ) : null}
          {scopeCheckError && !incidentsListError && !statsError ? (
            <div
              className="rounded-2xl border border-border/50 bg-muted/25 px-4 py-3 text-sm text-muted-foreground shadow-sm"
              role="status"
            >
              <p className="font-medium text-foreground/90">Scope check</p>
              <p className="mt-1 text-xs leading-relaxed">{scopeCheckError}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            <AdminHighestRiskHeroCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
              canAccessPhase2={canAccessPhase2}
            />
            <AdminNeedsAttentionTodayCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
              canAccessPhase2={canAccessPhase2}
            />
            <AdminDocumentationHealthCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
              stats={stats}
              statsLoading={statsLoading}
              statsFetchError={statsError}
            />
            <AdminIncidentPulseTodayCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
            />
            <AdminHighRiskResidentsCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
            />
            <AdminStaffThroughputCard
              incidents={incidents}
              incidentsLoading={incidentsLoading}
              snapshotError={incidentsListError}
              searchParams={searchParams}
            />
          </div>

          {!briefDismissed && effectiveFacilityId ? (
            <section id="daily-brief" className="scroll-mt-24 lg:hidden" aria-label="Daily brief">
              <DailyBriefPanel
                userDisplayName={userDisplayName}
                searchParams={searchParams}
                incidents={incidents}
                stats={stats}
                statsLoading={statsLoading}
                payload={briefPayload}
                loading={briefLoading}
                error={briefError}
                onDismiss={dismissBrief}
              />
            </section>
          ) : null}

          <section id="dc-open-investigations" className="min-h-0 scroll-mt-24" aria-label="Open investigations pipeline">
            <Tabs defaultValue="attention" className="flex min-h-0 w-full flex-col gap-2.5 sm:gap-3">
              <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
                <TabsTrigger
                  value="attention"
                  className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-2.5">
                    Needs Attention
                    <Badge className="rounded-full px-1.5 text-xs tabular-nums" style={{ backgroundColor: RED, color: "#fff" }}>
                      {attentionCount === null ? "…" : attentionCount}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-2.5">
                    Active Investigations
                    <Badge className="rounded-full bg-sky-600 px-1.5 text-xs tabular-nums text-white">
                      {activePhase2Count === null ? "…" : activePhase2Count}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="closed"
                  className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                >
                  Closed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attention" className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden">
                <div className="scrollbar-thin h-[min(64dvh,720px)] min-h-[220px] touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-border/80 bg-card/50 px-2 py-3 shadow-sm [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-4">
                  <NeedsAttentionTab
                    canAccessPhase2={canAccessPhase2}
                    onAttentionCount={onAttentionCount}
                    sharedIncidents={incidents}
                    sharedLoading={incidentsLoading}
                    setSharedIncidents={setIncidents}
                  />
                </div>
              </TabsContent>

              <TabsContent value="active" className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden">
                <div className="scrollbar-thin h-[min(64dvh,720px)] min-h-[220px] touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-border/80 bg-card/50 px-2 py-3 pb-6 shadow-sm [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-4 sm:pb-8">
                  <ActiveInvestigationsTab
                    onActiveCount={onActiveCount}
                    sharedIncidents={incidents}
                    sharedLoading={incidentsLoading}
                    useParentList
                  />
                </div>
              </TabsContent>

              <TabsContent value="closed" className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden">
                <div className="scrollbar-thin h-[min(64dvh,720px)] min-h-[220px] touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-border/80 bg-card/50 px-2 py-3 pb-6 shadow-sm [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-4 sm:pb-8">
                  <ClosedInvestigationsTab
                    facilityId={effectiveFacilityId}
                    organizationId={effectiveOrgId}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </TabsContent>

        <TabsContent value="trends" className="mt-0 min-h-0 flex flex-col space-y-6 outline-none data-[state=inactive]:hidden">
          <section className="scroll-mt-24 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end">
            <div className="w-full min-w-0 shrink-0 sm:max-w-md lg:max-w-sm xl:max-w-md">
              <AdminFacilitySwitcher defaultFacilityId={defaultFacilityId} layout="dashboardInline" />
            </div>
          </section>
          <AdminTrendsView
            trendsRange={trendsRange}
            onTrendsRangeChange={setTrendsRange}
            searchParams={searchParams}
            facilityId={effectiveFacilityId}
          />
          {effectiveFacilityId ? (
            <section className="scroll-mt-24 lg:hidden" aria-label="Weekly brief">
              <AdminTrendsWeeklyBriefPanel
                trendsRange={trendsRange}
                searchParams={searchParams}
                facilityId={effectiveFacilityId}
              />
            </section>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )

  const sidebar = (
    <aside
      className={cn(
        "order-last w-full shrink-0 space-y-4 lg:order-none lg:sticky lg:top-20 lg:max-h-[calc(100dvh-5rem)] lg:w-[280px] lg:overflow-y-auto lg:overscroll-contain lg:self-start",
        dashboardView === "trends" && "hidden lg:block",
      )}
    >
      {dashboardView === "trends" ? (
        <div className="hidden lg:block">
          <AdminTrendsWeeklyBriefPanel
            trendsRange={trendsRange}
            searchParams={searchParams}
            facilityId={effectiveFacilityId}
          />
        </div>
      ) : (
        <>
          {!briefDismissed && effectiveFacilityId ? (
            <div className="hidden lg:block">
              <DailyBriefPanel
                userDisplayName={userDisplayName}
                searchParams={searchParams}
                incidents={incidents}
                stats={stats}
                statsLoading={statsLoading}
                payload={briefPayload}
                loading={briefLoading}
                error={briefError}
                onDismiss={dismissBrief}
              />
            </div>
          ) : null}
          <StatsSidebar
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={statsError ? () => void loadDashboardStats({ showLoading: true }) : undefined}
          />
        </>
      )}
    </aside>
  )

  const dashboardLayout = (
    <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-[1600px] flex-col gap-6 px-4 py-6 pb-10 sm:pb-8 lg:flex-row lg:items-start lg:px-6">
      {mainColumn}
      {sidebar}
    </div>
  )

  return (
    <div className="relative w-full min-h-0 flex-1">
      <DashboardOnboarding role="admin" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      {dashboardView === "trends" ? (
        <TrendsSnapshotProvider
          trendsRange={trendsRange}
          facilityId={effectiveFacilityId}
          searchParams={searchParams}
        >
          {dashboardLayout}
        </TrendsSnapshotProvider>
      ) : (
        dashboardLayout
      )}
    </div>
  )
}
