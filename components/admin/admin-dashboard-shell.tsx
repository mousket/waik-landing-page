"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { toast } from "sonner"
import { ActiveInvestigationsTab } from "@/components/admin/active-investigations-tab"
import { ClosedInvestigationsTab } from "@/components/admin/closed-incidents-tab"
import { DailyBrief } from "@/components/admin/daily-brief"
import { NeedsAttentionTab } from "@/components/admin/needs-attention-tab"
import { StatsSidebar } from "@/components/admin/stats-sidebar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEffectiveAdminFacilityId, getEffectiveAdminOrganizationId } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"

const RED = "#C0392B"

type FacilityOption = { id: string; name: string; organizationId: string }

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
  showFacilityPicker,
  isWaikSuperAdmin = false,
}: {
  canAccessPhase2: boolean
  userDisplayName: string
  /** Default facility (from user record) if none selected yet. */
  defaultFacilityId?: string
  /** Show facility picker for super admins and admins. */
  showFacilityPicker: boolean
  isWaikSuperAdmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useAdminUrlSearchParams()

  const facilityIdFromUrl = (searchParams.get("facilityId") || "").trim() || undefined
  const [facilityId, setFacilityId] = useState<string | undefined>(
    () => (facilityIdFromUrl ?? (defaultFacilityId || "").trim()) || undefined,
  )
  const [facilityOptions, setFacilityOptions] = useState<FacilityOption[]>([])
  const [facilityLoading, setFacilityLoading] = useState(showFacilityPicker)

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

  // Facility picker: load options + choose initial facility.
  useEffect(() => {
    let cancelled = false

    async function loadFacilities() {
      if (!showFacilityPicker) {
        setFacilityLoading(false)
        return
      }
      setFacilityLoading(true)
      try {
        const res = await fetch("/api/facilities", { credentials: "include" })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(typeof j.error === "string" ? j.error : "Could not load facilities")
        }
        const data = (await res.json()) as { facilities?: FacilityOption[] }
        const list = Array.isArray(data.facilities) ? data.facilities : []
        if (!cancelled) setFacilityOptions(list)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load facilities"
        if (!cancelled) {
          setFacilityOptions([])
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setFacilityLoading(false)
      }
    }

    void loadFacilities()
    return () => {
      cancelled = true
    }
  }, [showFacilityPicker])

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

  // Super admin with no `user.facilityId` but exactly one org facility: lock URL to it (mirrors
  // `AdminFacilitySwitcher` so the dashboard is not stuck without `?facilityId=`).
  useEffect(() => {
    if (!isWaikSuperAdmin) return
    if (facilityIdFromUrl) return
    if ((defaultFacilityId || "").trim()) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/facilities", { credentials: "include" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { facilities?: FacilityOption[] }
        const list = Array.isArray(data.facilities) ? data.facilities : []
        if (list.length !== 1 || cancelled) return
        const only = (list[0]!.id || "").trim()
        if (!only) return
        if (pathname === "/admin/dashboard") {
          applyFacilityIdToPath(router, pathname, searchParams, only)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [defaultFacilityId, facilityIdFromUrl, isWaikSuperAdmin, pathname, router, searchParams])

  // Keep facilityId in sync with URL + localStorage, and auto-pick a sensible default.
  useEffect(() => {
    if (!showFacilityPicker) {
      // Still allow query param override (useful for super admin deep links).
      setFacilityId((facilityIdFromUrl ?? (defaultFacilityId || "").trim()) || undefined)
      return
    }

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

    const candidate = fromStorage ?? defaultFacilityId ?? undefined
    if (!candidate) {
      setFacilityId(undefined)
      return
    }

    // If we have facilityOptions, ensure candidate is valid; otherwise accept it optimistically.
    const valid =
      facilityOptions.length === 0 ? true : facilityOptions.some((f) => f.id === candidate)
    if (!valid) {
      setFacilityId(undefined)
      return
    }

    setFacilityId(candidate)
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("facilityId", candidate)
    router.replace(`${pathname}?${sp.toString()}`)
  }, [defaultFacilityId, facilityIdFromUrl, facilityOptions, pathname, router, searchParams, showFacilityPicker])

  const facilityLabel = useMemo(() => {
    if (!facilityId) return null
    const row = facilityOptions.find((f) => f.id === facilityId)
    return row?.name ?? facilityId
  }, [facilityId, facilityOptions])

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

  const facilityPicker = showFacilityPicker ? (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Managing facility</p>
          <p className="mt-1 text-xs text-muted-foreground">Pick the facility you want the dashboard to load.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="facility-select">
            Facility
          </label>
          <select
            id="facility-select"
            className="min-h-[44px] min-w-[260px] max-w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm"
            value={facilityId ?? ""}
            disabled={facilityLoading || facilityOptions.length === 0}
            onChange={(e) => {
              const next = e.target.value.trim() || undefined
              setFacilityId(next)
              if (next) {
                try {
                  window.localStorage.setItem("waik:admin:facilityId", next)
                } catch {
                  // ignore
                }
                const sp = new URLSearchParams(searchParams.toString())
                sp.set("facilityId", next)
                router.replace(`${pathname}?${sp.toString()}`)
              }
            }}
          >
            <option value="" disabled>
              {facilityLoading ? "Loading facilities…" : "Select a facility…"}
            </option>
            {facilityOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!facilityId ? (
        <p className="mt-3 text-sm text-amber-800">
          Select a facility to load incidents and stats.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Current facility: <span className="font-medium text-foreground">{facilityLabel}</span>
        </p>
      )}
    </section>
  ) : null

  const mainColumn = (
    <div className="min-w-0 flex-1 space-y-6">
      {facilityPicker}
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
      {scopeHealthLine && !incidentsListError ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{scopeHealthLine}</p>
      ) : null}
      {stats && !statsLoading ? <DailyBrief stats={stats} userDisplayName={userDisplayName} /> : null}

      <Tabs defaultValue="attention" className="w-full gap-4">
        <TabsList className="mb-2 flex h-auto w-full min-h-[48px] flex-wrap items-stretch justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 sm:gap-4">
          <TabsTrigger
            value="attention"
            className="rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="flex items-center gap-2">
              Needs Attention
              <Badge className="rounded-full px-1.5 text-xs" style={{ backgroundColor: RED, color: "#fff" }}>
                {attentionCount === null ? "…" : attentionCount}
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            <span className="flex items-center gap-2">
              Active Investigations
              <Badge className="rounded-full bg-sky-600 px-1.5 text-xs text-white">
                {activePhase2Count === null ? "…" : activePhase2Count}
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="closed"
            className="rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            Closed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attention" className="mt-0 space-y-8 outline-none">
          <NeedsAttentionTab
            canAccessPhase2={canAccessPhase2}
            onAttentionCount={onAttentionCount}
            sharedIncidents={incidents}
            sharedLoading={incidentsLoading}
            setSharedIncidents={setIncidents}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-0 space-y-4 outline-none">
          <ActiveInvestigationsTab
            onActiveCount={onActiveCount}
            sharedIncidents={incidents}
            sharedLoading={incidentsLoading}
            useParentList
          />
        </TabsContent>

        <TabsContent value="closed" className="mt-0 space-y-4 outline-none">
          <ClosedInvestigationsTab
            facilityId={effectiveFacilityId}
            organizationId={effectiveOrgId}
          />
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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
        {mainColumn}
        {sidebar}
      </div>
    </div>
  )
}
