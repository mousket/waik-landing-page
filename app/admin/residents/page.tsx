"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString, buildAdminPathWithContext, buildAdminIncidentsApiPath } from "@/lib/admin-nav-context"
import {
  adminResidentsUrlHasTrendsDrilldown,
  parseAdminResidentsTrendsDrilldown,
  residentsTrendsCurrentWindow,
} from "@/lib/admin/parse-admin-residents-url"
import { buildCohortDriverMap } from "@/lib/admin/trends-high-risk-cohort-metrics"
import { trendsRangeDayCount } from "@/lib/admin/trends-range"
import { ResidentDirectorySearch } from "@/components/residents/resident-directory-search"
import { ResidentDirectoryTable } from "@/components/residents/resident-directory-table"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ResidentDirectoryRow } from "@/lib/types/resident-directory"
import { residentFullName } from "@/lib/types/resident-directory"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Plus } from "lucide-react"

const CARE_OPTIONS = [
  { value: "independent", label: "Independent" },
  { value: "assisted", label: "Assisted" },
  { value: "memory_care", label: "Memory care" },
  { value: "skilled_nursing", label: "Skilled nursing" },
]

export default function AdminResidentsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [residents, setResidents] = useState<ResidentDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [careLevel, setCareLevel] = useState("assisted")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusF, setStatusF] = useState<"all" | "active" | "discharged" | "on-leave" | "inactive">("all")

  const trendsDrilldown = useMemo(() => parseAdminResidentsTrendsDrilldown(searchParams), [searchParams.toString()])
  const [cohortIncidents, setCohortIncidents] = useState<IncidentSummary[] | null>(null)
  const [cohortLoading, setCohortLoading] = useState(false)
  const [cohortError, setCohortError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const ctxQ = (apiCtx.startsWith("?") ? apiCtx.slice(1) : apiCtx) || ""
      const s = new URLSearchParams(ctxQ)
      if (statusF !== "all") {
        s.set("status", statusF)
      }
      const qs = s.toString()
      const res = await fetch(qs ? `/api/residents?${qs}` : "/api/residents", { credentials: "include" })
      if (!res.ok) {
        setResidents([])
        return
      }
      const j = (await res.json()) as { residents: ResidentDirectoryRow[] }
      setResidents(j.residents ?? [])
    } finally {
      setLoading(false)
    }
  }, [apiCtx, statusF])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return residents
    const q = search.toLowerCase()
    return residents.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q),
    )
  }, [residents, search])

  useEffect(() => {
    if (!adminResidentsUrlHasTrendsDrilldown(searchParams)) {
      setCohortIncidents(null)
      setCohortError(null)
      setCohortLoading(false)
      return
    }
    let cancelled = false
    setCohortLoading(true)
    setCohortError(null)
    setCohortIncidents(null)
    const range = trendsDrilldown.trendsRange
    const days = Math.min(400, trendsRangeDayCount(range) * 2 + 14)
    const path = buildAdminIncidentsApiPath(searchParams, { days: String(days) })
    void fetch(path, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? "Could not load incidents for cohort")
        }
        const j = (await res.json()) as { incidents?: IncidentSummary[] }
        if (!cancelled) setCohortIncidents(j.incidents ?? [])
      })
      .catch((e) => {
        if (!cancelled) {
          setCohortIncidents(null)
          setCohortError(e instanceof Error ? e.message : "Could not load cohort data")
        }
      })
      .finally(() => {
        if (!cancelled) setCohortLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [searchParams, trendsDrilldown.trendsRange, trendsDrilldown.riskHigh, trendsDrilldown.driver])

  const cohortMap = useMemo(() => {
    if (!adminResidentsUrlHasTrendsDrilldown(searchParams) || cohortIncidents == null) return null
    const win = residentsTrendsCurrentWindow(searchParams)
    return buildCohortDriverMap(cohortIncidents, win, Date.now())
  }, [cohortIncidents, searchParams])

  const directoryRows = useMemo(() => {
    if (!adminResidentsUrlHasTrendsDrilldown(searchParams) || cohortMap == null) return filtered
    const driver = trendsDrilldown.driver
    return filtered.filter((row) => {
      const keys = [
        `id:${row.id}`,
        `nm:${residentFullName(row).trim().toLowerCase()}|${row.roomNumber.trim().toLowerCase()}`,
      ]
      const inCohort = keys.some((k) => cohortMap.has(k))
      if (!inCohort) return false
      if (!driver) return true
      return keys.some((k) => cohortMap.get(k)?.includes(driver))
    })
  }, [filtered, cohortMap, searchParams, trendsDrilldown.driver])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/residents${apiCtx}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, roomNumber, careLevel }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(j.error ?? "Could not create resident")
        return
      }
      setFirstName("")
      setLastName("")
      setRoomNumber("")
      setCareLevel("assisted")
      setOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:space-y-8 md:py-8">
        <PageHeader
          title="Residents"
          description="Residents at your facility."
          actions={
            <Button className="min-h-12 shadow-lg shadow-primary/20" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add resident
            </Button>
          }
        />

        {adminResidentsUrlHasTrendsDrilldown(searchParams) ? (
          <div
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/90"
            role="status"
          >
            <span className="font-semibold">Trends cohort filter</span> — directory is narrowed using incident-derived
            signals for {trendsDrilldown.trendsRange}
            {trendsDrilldown.riskHigh ? " (high-risk cohort)" : ""}
            {trendsDrilldown.driver ? ` · driver: ${trendsDrilldown.driver}` : ""}. Clear query params in the address bar
            to return to the full list.
            {cohortError ? <span className="mt-1 block text-destructive">{cohortError}</span> : null}
          </div>
        ) : null}

        <WaikCard>
          <WaikCardContent className="space-y-0 p-0">
            <div className="flex flex-col gap-4 border-b border-border/50 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Directory</CardTitle>
                <CardDescription>Search by name or room. Status filter reloads the list.</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-xs">
                  <ResidentDirectorySearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Search…"
                  />
                </div>
                <div className="w-full min-w-0 sm:w-40">
                  <Label className="sr-only">Status</Label>
                  <Select
                    value={statusF}
                    onValueChange={(v) => {
                      if (v === "all" || v === "active" || v === "discharged" || v === "on-leave" || v === "inactive") {
                        setStatusF(v)
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 min-h-12">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-leave">On leave</SelectItem>
                      <SelectItem value="discharged">Discharged</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="p-0">
              <ResidentDirectoryTable
                residents={directoryRows}
                loading={loading || (adminResidentsUrlHasTrendsDrilldown(searchParams) && cohortLoading)}
                variant="admin"
                emptyMessage={
                  adminResidentsUrlHasTrendsDrilldown(searchParams) && cohortMap != null
                    ? "No residents matched this cohort filter"
                    : "No residents yet"
                }
                getResidentHref={(resident) => buildAdminPathWithContext(`/residents/${resident.id}`, searchParams)}
              />
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add resident</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfn">First name</Label>
                <Input id="rfn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rln">Last name</Label>
                <Input id="rln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Room number</Label>
              <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Care level</Label>
              <Select value={careLevel} onValueChange={setCareLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
