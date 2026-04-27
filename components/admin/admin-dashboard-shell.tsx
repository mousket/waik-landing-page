"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { toast } from "sonner"
import { DashboardOnboarding } from "@/components/dashboard-onboarding"
import { ActiveInvestigationsTab } from "@/components/admin/active-investigations-tab"
import { ClosedInvestigationsTab } from "@/components/admin/closed-incidents-tab"
import { AdminFacilitySwitcher } from "@/components/admin/admin-facility-switcher"
import { AdminDashboardGreeting, DailyBrief } from "@/components/admin/daily-brief"
import { NeedsAttentionTab } from "@/components/admin/needs-attention-tab"
import { StatsSidebar } from "@/components/admin/stats-sidebar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEffectiveAdminFacilityId, getEffectiveAdminOrganizationId } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
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
  router: { replace: (url: string) => void },
  pathname: string,
  current: Readonly<URLSearchParams> | { toString: () => string },
  facilityId: string,
) {
  const sp = new URLSearchParams(current.toString())
  sp.set("facilityId", facilityId)
  const q = sp.toString()
  router.replace(q ? `${pathname}?${q}` : pathname)
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

  const loadIncidents = useCallback(async () => {
    if (incidentsFirstLoad.current) setIncidentsLoading(true)
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
      if (incidentsFirstLoad.current) {
        incidentsFirstLoad.current = false
        setIncidentsLoading(false)
      }
    }
  }, [defaultFacilityId, facilityId, searchParams])

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
    let cancelled = false
    async function load() {
      setStatsLoading(true)
      setStatsError(null)
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
        if (!cancelled) {
          setStats(null)
          setStatsLoading(false)
        }
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
        if (!cancelled) {
          setStats(data)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load dashboard stats"
        if (!cancelled) {
          setStats(null)
          setStatsError(msg)
        }
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [defaultFacilityId, facilityId, searchParams])

  const mainColumn = (
    <div className="min-h-0 min-w-0 flex-1 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <AdminDashboardGreeting userDisplayName={userDisplayName} scopeHealthLine={scopeHealthLine} />
        </div>
        <div className="w-full min-w-0 shrink-0 lg:max-w-md xl:max-w-lg">
          <AdminFacilitySwitcher defaultFacilityId={defaultFacilityId} layout="dashboardInline" />
        </div>
      </div>
      {incidentsListError ? (
        <div
          className="rounded-lg border border-red-200/90 bg-red-50/90 p-3 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Could not load incidents for this view</p>
          <p className="mt-1 text-red-800/90">{incidentsListError}</p>
        </div>
      ) : null}
      {scopeCheckError && !incidentsListError ? (
        <div
          className="rounded-lg border border-amber-200/90 bg-amber-50/90 p-3 text-sm text-amber-950 shadow-sm"
          role="status"
        >
          <p className="font-medium">Could not confirm database scope</p>
          <p className="mt-1 text-amber-900/90">{scopeCheckError}</p>
        </div>
      ) : null}
      {/* scopeHealthLine is rendered inside the Command center card. */}
      {stats && !statsLoading ? <DailyBrief stats={stats} userDisplayName={userDisplayName} /> : null}

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
    </div>
  )

  const sidebar = (
    <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-[280px] lg:self-start">
      <StatsSidebar stats={stats} loading={statsLoading} error={statsError} />
    </aside>
  )

  return (
    <div className="relative w-full flex-1">
      <DashboardOnboarding role="admin" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
        {mainColumn}
        {sidebar}
      </div>
    </div>
  )
}
