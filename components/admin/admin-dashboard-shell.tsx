"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ActiveInvestigationsTab } from "@/components/admin/active-investigations-tab"
import { ClosedInvestigationsTab } from "@/components/admin/closed-incidents-tab"
import { DailyBrief } from "@/components/admin/daily-brief"
import { NeedsAttentionTab } from "@/components/admin/needs-attention-tab"
import { StatsSidebar } from "@/components/admin/stats-sidebar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { brand } from "@/lib/design-tokens"
import type { DashboardStats } from "@/lib/types/dashboard-stats"
import type { IncidentSummary } from "@/lib/types/incident-summary"

const RED = "#C0392B"

type FacilityOption = { id: string; name: string; organizationId: string }

const INCIDENT_PHASES_QUERY = "phase=phase_1_in_progress,phase_1_complete,phase_2_in_progress"

function buildIncidentsUrl(facilityId?: string) {
  const q = facilityId?.trim() ? `&facilityId=${encodeURIComponent(facilityId.trim())}` : ""
  return `/api/incidents?${INCIDENT_PHASES_QUERY}${q}`
}

export function AdminDashboardShell({
  canAccessPhase2,
  userDisplayName,
  defaultFacilityId,
  showFacilityPicker,
}: {
  canAccessPhase2: boolean
  userDisplayName: string
  /** Default facility (from user record) if none selected yet. */
  defaultFacilityId?: string
  /** Show facility picker for super admins and admins. */
  showFacilityPicker: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const facilityIdFromUrl = (searchParams.get("facilityId") || "").trim() || undefined
  const [facilityId, setFacilityId] = useState<string | undefined>(facilityIdFromUrl ?? undefined)
  const [facilityOptions, setFacilityOptions] = useState<FacilityOption[]>([])
  const [facilityLoading, setFacilityLoading] = useState(showFacilityPicker)

  const [attentionCount, setAttentionCount] = useState<number | null>(null)
  const [activePhase2Count, setActivePhase2Count] = useState<number | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const incidentsFirstLoad = useRef(true)

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

  // Keep facilityId in sync with URL + localStorage, and auto-pick a sensible default.
  useEffect(() => {
    if (!showFacilityPicker) {
      // Still allow query param override (useful for super admin deep links).
      setFacilityId(facilityIdFromUrl ?? defaultFacilityId ?? undefined)
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
    router.replace(`/admin/dashboard?${sp.toString()}`)
  }, [defaultFacilityId, facilityIdFromUrl, facilityOptions, router, searchParams, showFacilityPicker])

  const facilityLabel = useMemo(() => {
    if (!facilityId) return null
    const row = facilityOptions.find((f) => f.id === facilityId)
    return row?.name ?? facilityId
  }, [facilityId, facilityOptions])

  const loadIncidents = useCallback(async () => {
    if (incidentsFirstLoad.current) setIncidentsLoading(true)
    try {
      const res = await fetch(buildIncidentsUrl(facilityId), { credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(typeof j.error === "string" ? j.error : "Could not load incidents")
        setIncidents([])
        return
      }
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      toast.error("Could not load incidents")
      setIncidents([])
    } finally {
      if (incidentsFirstLoad.current) {
        incidentsFirstLoad.current = false
        setIncidentsLoading(false)
      }
    }
  }, [facilityId])

  useEffect(() => {
    if (!facilityId) return
    void loadIncidents()
    const id = window.setInterval(() => void loadIncidents(), 60_000)
    return () => window.clearInterval(id)
  }, [loadIncidents])

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
      try {
        const q = facilityId?.trim() ? `?facilityId=${encodeURIComponent(facilityId.trim())}` : ""
        const res = await fetch(`/api/admin/dashboard-stats${q}`, { credentials: "include" })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(typeof j.error === "string" ? j.error : "Could not load dashboard stats")
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
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [facilityId])

  const facilityPicker = showFacilityPicker ? (
    <section className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: brand.darkTeal }}>
            Managing facility
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            Pick the facility you want the dashboard to load.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-brand-muted" htmlFor="facility-select">
            Facility
          </label>
          <select
            id="facility-select"
            className="min-h-[44px] min-w-[260px] max-w-full rounded-md border border-brand-mid-gray bg-white px-3 py-2 text-sm font-medium text-brand-body shadow-sm"
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
                router.replace(`/admin/dashboard?${sp.toString()}`)
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
        <p className="mt-3 text-xs text-brand-muted">
          Current facility: <span className="font-medium text-brand-body">{facilityLabel}</span>
        </p>
      )}
    </section>
  ) : null

  const mainColumn = (
    <div className="min-w-0 flex-1 space-y-6">
      {facilityPicker}
      {stats && !statsLoading ? <DailyBrief stats={stats} userDisplayName={userDisplayName} /> : null}

      <Tabs defaultValue="attention" className="w-full gap-4">
        <TabsList className="mb-2 flex h-auto w-full min-h-[48px] flex-wrap items-stretch justify-start gap-1 rounded-none border-b border-brand-mid-gray bg-transparent p-0 sm:gap-4">
          <TabsTrigger
            value="attention"
            className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
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
            className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent"
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
            className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent"
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
          />
        </TabsContent>

        <TabsContent value="closed" className="mt-0 space-y-4 outline-none">
          <ClosedInvestigationsTab facilityId={facilityId} />
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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
      {mainColumn}
      {sidebar}
    </div>
  )
}
