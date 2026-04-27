"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Dna,
  FileText,
  HeartPulse,
  LayoutGrid,
  Pill,
  Stethoscope,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { IncidentPhase } from "@/lib/types/incident-summary"

/** Consistent order for phase chips and dropdowns. */
const PHASE_FILTER_ORDER: readonly IncidentPhase[] = [
  "phase_1_in_progress",
  "phase_1_complete",
  "phase_2_in_progress",
  "closed",
] as const

export function displayIncidentPhase(phase: string): string {
  switch (phase) {
    case "phase_1_in_progress":
      return "Phase 1 · in progress"
    case "phase_1_complete":
      return "Phase 1 · complete"
    case "phase_2_in_progress":
      return "Phase 2 · in progress"
    case "closed":
      return "Closed"
    default:
      return (phase || "").replace(/_/g, " ") || "—"
  }
}

export function displayIncidentPhaseShort(phase: string): string {
  switch (phase) {
    case "phase_1_in_progress":
      return "P1 ongoing"
    case "phase_1_complete":
      return "P1 complete"
    case "phase_2_in_progress":
      return "Phase 2"
    case "closed":
      return "Closed"
    default:
      return (phase || "").replace(/_/g, " ") || "—"
  }
}

export type ResidentIncidentRow = {
  id: string
  title: string
  phase: string
  completenessScore: number
  createdAt: string | null
  startedAt?: string | null
  staffName: string
  incidentType: string
}

export function displayIncidentType(raw: string) {
  const t = (raw || "").replace(/[_-]+/g, " ").trim()
  if (!t) return "Report"
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Icon for an incident type string (keyword heuristics). */
export function iconForIncidentType(raw: string): LucideIcon {
  const s = (raw || "incident").toLowerCase()
  if (/\bfall\b|slip|trip|syncope|unwitnessed fall/.test(s)) return Activity
  if (/med|drug|pharm|adverse|order|abx|dose|error|iv\b/.test(s)) return Pill
  if (/skin|wound|pressure|ulcer|lacerat|burn|bruise|hematoma/.test(s)) return Stethoscope
  if (/infect|fever|seps|respir|pneu|uri|flu|covid|uti/.test(s)) return Dna
  if (/diet|nutrition|food|aspirat|dehydr|swallow|tube feed/.test(s)) return UtensilsCrossed
  if (/behavior|abuse|aggress|elope|wander|neglect|rights|altercation/.test(s)) return AlertTriangle
  if (/chest|cardiac|stroke|heart|bleed|vital|pain/.test(s)) return HeartPulse
  if (/elder|resident|transfer|admission|d\/c|discharge/.test(s)) return UserRound
  return FileText
}

export function useResidentIncidentFilters(incidents: ResidentIncidentRow[]) {
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [staffFilter, setStaffFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [phaseFilter, setPhaseFilter] = useState<"all" | string>("all")

  const staffOptions = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) {
      const n = (i.staffName || "").trim()
      if (n) s.add(n)
    }
    return [...s].sort()
  }, [incidents])

  const typeOptions = useMemo(() => {
    const t = new Set<string>()
    for (const i of incidents) {
      t.add((i.incidentType || "incident").toLowerCase())
    }
    return [...t].sort()
  }, [incidents])

  const phaseOptions = useMemo(() => {
    const present = new Set(incidents.map((i) => (i.phase || "").trim()).filter(Boolean))
    const ordered = PHASE_FILTER_ORDER.filter((p) => present.has(p))
    const rest = [...present].filter((p) => !PHASE_FILTER_ORDER.includes(p as IncidentPhase)).sort()
    return [...ordered, ...rest] as string[]
  }, [incidents])

  const topTypes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of incidents) {
      const k = (i.incidentType || "incident").toLowerCase()
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0])
  }, [incidents])

  /** “All” plus one quick tile per distinct type (up to 3) — no empty placeholders. */
  const quickTiles = useMemo((): { key: string; label: string; sub: string; value: string | "all" }[] => {
    const tiles: { key: string; label: string; sub: string; value: string | "all" }[] = [
      { key: "all", label: "All reports", sub: "Show every linked incident", value: "all" },
    ]
    for (const typ of topTypes) {
      tiles.push({
        key: `t-${typ}`,
        label: displayIncidentType(typ),
        sub: "This incident type in this list",
        value: typ,
      })
    }
    return tiles
  }, [topTypes])

  const filtered = useMemo(() => {
    const fromT = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toT = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null

    return incidents.filter((i) => {
      const tIso = i.startedAt || i.createdAt
      if (fromT != null) {
        const t = tIso ? new Date(tIso).getTime() : 0
        if (t < fromT) return false
      }
      if (toT != null) {
        const t = tIso ? new Date(tIso).getTime() : 0
        if (t > toT) return false
      }
      if (staffFilter !== "all" && (i.staffName || "") !== staffFilter) return false
      const tNorm = (i.incidentType || "incident").toLowerCase()
      if (typeFilter !== "all" && tNorm !== typeFilter.toLowerCase()) return false
      if (phaseFilter !== "all" && (i.phase || "") !== phaseFilter) return false
      return true
    })
  }, [incidents, dateFrom, dateTo, staffFilter, typeFilter, phaseFilter])

  const resetFilters = useCallback(() => {
    setDateFrom("")
    setDateTo("")
    setStaffFilter("all")
    setTypeFilter("all")
    setPhaseFilter("all")
  }, [])

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    staffFilter,
    setStaffFilter,
    typeFilter,
    setTypeFilter,
    staffOptions,
    typeOptions,
    quickTiles,
    topTypes,
    phaseFilter,
    setPhaseFilter,
    phaseOptions,
    resetFilters,
    filtered,
  }
}

export type ResidentIncidentFilters = ReturnType<typeof useResidentIncidentFilters>
type F = ResidentIncidentFilters

type SectionProps = {
  incidents: ResidentIncidentRow[]
  searchParams: URLSearchParams
}

/** Pills for meta on incident and note cards (shared look). */
export function residentRecordPillClass() {
  return "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 sm:text-xs"
}

function filterPillClass() {
  return residentRecordPillClass()
}

function phaseLabel(phase: string) {
  return (phase || "").replace(/_/g, " ") || "—"
}

export function FilterChip({
  children,
  active,
  onClick,
  disabled,
  title: titleAttr,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={titleAttr}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 max-w-full shrink-0 rounded-full border px-2.5 text-left text-xs font-medium leading-tight transition-all sm:px-3",
        active
          ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
          : "border-border/50 bg-background/60 text-foreground/90 hover:border-primary/30 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  )
}

export function ResidentQuickFilterCard({
  label,
  sub,
  active,
  icon: Icon,
  disabled,
  onSelect,
}: {
  label: string
  sub: string
  active: boolean
  icon: LucideIcon
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full min-h-[4.5rem] items-start gap-3 rounded-xl border bg-background p-3 text-left transition-all duration-200 sm:min-h-[5rem] sm:gap-4 sm:p-4",
        "hover:shadow-md hover:-translate-y-0.5",
        active
          ? "border-primary/50 shadow-md ring-1 ring-primary/20"
          : "border-border hover:border-destructive/50",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12",
          active ? "bg-primary/20 text-primary" : "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold leading-tight text-foreground sm:text-base">{label}</h4>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:mt-1">{sub}</p>
      </div>
    </button>
  )
}

export function ResidentIncidentsFilterStrip({ incidents, f }: { incidents: ResidentIncidentRow[]; f: F }) {
  const {
    quickTiles,
    typeFilter,
    setTypeFilter,
    staffOptions,
    typeOptions,
    phaseFilter,
    setPhaseFilter,
    phaseOptions,
    resetFilters,
  } = f

  const hasExtraFilters =
    (f.phaseFilter && f.phaseFilter !== "all") ||
    f.typeFilter !== "all" ||
    Boolean(f.dateFrom) ||
    Boolean(f.dateTo) ||
    f.staffFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
       
        {hasExtraFilters
          ? (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )
          : null}
      </div>

      {incidents.length > 0
        ? (
            <div className="space-y-1.5">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-left">
                Phase
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <FilterChip
                  active={phaseFilter === "all"}
                  disabled={incidents.length === 0}
                  onClick={() => {
                    setPhaseFilter("all")
                  }}
                >
                  All phases
                </FilterChip>
                {phaseOptions.map((p) => (
                  <FilterChip
                    key={p}
                    active={phaseFilter === p}
                    disabled={incidents.length === 0}
                    onClick={() => {
                      setPhaseFilter(p)
                    }}
                  >
                    {displayIncidentPhaseShort(p)}
                  </FilterChip>
                ))}
              </div>
            </div>
          )
        : null}
      <div
        className={cn(
          "grid gap-3 min-[400px]:gap-4",
          quickTiles.length <= 2
            ? "grid-cols-1 min-[400px]:grid-cols-2"
            : quickTiles.length === 3
              ? "grid-cols-1 min-[400px]:grid-cols-3"
              : "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {quickTiles.map((tile) => {
          const isAllTile = tile.key === "all"
          const active = isAllTile
            ? typeFilter === "all"
            : (typeFilter || "").toLowerCase() === String(tile.value).toLowerCase()
          const typeForIcon = isAllTile ? "incident" : String(tile.value)
          const Icon = isAllTile ? LayoutGrid : iconForIncidentType(typeForIcon)
          return (
            <ResidentQuickFilterCard
              key={tile.key}
              label={tile.label}
              sub={tile.sub}
              icon={Icon}
              active={active}
              disabled={incidents.length === 0}
              onSelect={() => {
                if (incidents.length === 0) return
                setTypeFilter(isAllTile ? "all" : String(tile.value))
              }}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" htmlFor="r-type-filter">
            Incident type
          </Label>
          <Select value={f.typeFilter} onValueChange={(v) => f.setTypeFilter(v)}>
            <SelectTrigger id="r-type-filter" className="min-h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {displayIncidentType(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" htmlFor="r-from">
            From date
          </Label>
          <Input
            id="r-from"
            type="date"
            value={f.dateFrom}
            onChange={(e) => f.setDateFrom(e.target.value)}
            className="min-h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" htmlFor="r-to">
            To date
          </Label>
          <Input
            id="r-to"
            type="date"
            value={f.dateTo}
            onChange={(e) => f.setDateTo(e.target.value)}
            className="min-h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" htmlFor="r-staff-filter">
            Reporting staff
          </Label>
          <Select value={f.staffFilter} onValueChange={(v) => f.setStaffFilter(v)}>
            <SelectTrigger id="r-staff-filter" className="min-h-10 w-full">
              <SelectValue placeholder="All staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {staffOptions.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export function ResidentIncidentPillEvent({
  x,
  searchParams,
  getIncidentHref,
}: {
  x: ResidentIncidentRow
  searchParams: URLSearchParams
  /** When set (e.g. staff profile), links to this URL instead of admin incident context. */
  getIncidentHref?: (incidentId: string) => string
}) {
  const Icon = iconForIncidentType(x.incidentType)
  const when = x.startedAt?.slice(0, 10) || x.createdAt?.slice(0, 10) || "—"
  const viewHref = getIncidentHref
    ? getIncidentHref(x.id)
    : buildAdminPathWithContext(`/admin/incidents/${x.id}`, searchParams)

  return (
    <li
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-background/95 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4",
        "shadow-sm transition-all duration-200 hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive sm:h-12 sm:w-12 sm:rounded-xl">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
            {x.title || "Incident"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
            <span className={filterPillClass()}>
              {displayIncidentType(x.incidentType)}
            </span>
            <span className={filterPillClass()}>
              {when}
            </span>
            <span className={filterPillClass()}>
              {(x.staffName || "—").trim() || "—"}
            </span>
            <span className={filterPillClass()}>
              {phaseLabel(x.phase)}
            </span>
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary sm:text-xs">
              {x.completenessScore}% complete
            </span>
          </div>
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-auto sm:self-center">
        <Button variant="outline" size="sm" className="h-9 w-full min-h-9 sm:min-w-[5.5rem] sm:max-w-[7rem] sm:shrink-0" asChild>
          <Link href={viewHref}>View</Link>
        </Button>
      </div>
    </li>
  )
}

export function ResidentIncidentsList({
  incidents,
  searchParams,
  f,
  getIncidentHref,
}: SectionProps & { f: F; getIncidentHref?: (incidentId: string) => string }) {
  const rows = f.filtered

  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground">No linked incidents yet.</p>
  }

  return (
    <div className="min-h-0 w-full space-y-4 overflow-x-hidden pb-8">
      <ResidentIncidentsFilterStrip incidents={incidents} f={f} />
      <p className="text-center text-sm text-muted-foreground">
        {rows.length} of {incidents.length} report{incidents.length === 1 ? "" : "s"} in view
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          No incidents match the current filters. Try adjusting type, date, or staff.
        </p>
      ) : (
        <ul className="space-y-2.5" role="list">
          {rows.map((x) => (
            <ResidentIncidentPillEvent
              key={x.id}
              x={x}
              searchParams={searchParams}
              getIncidentHref={getIncidentHref}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
