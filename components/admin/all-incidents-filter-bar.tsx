"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { displayIncidentPhaseShort, displayIncidentType } from "@/lib/incidents/presentation"
import { cn } from "@/lib/utils"
import {
  FilterChip,
  type ResidentIncidentRow,
  type ResidentIncidentFilters,
} from "@/components/admin/resident-incidents-section"
import { trendBucketLabel } from "@/lib/admin/trends-incident-type-buckets"

export function AllIncidentsFilterBar({ incidents, f }: { incidents: ResidentIncidentRow[]; f: ResidentIncidentFilters }) {
  const {
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
    phaseFilter,
    setPhaseFilter,
    phaseOptions,
    trendTypeBucket,
    setTrendTypeBucket,
    phaseInFilter,
    setPhaseInFilter,
    resetFilters,
  } = f

  const hasFilters =
    phaseFilter !== "all" ||
    typeFilter !== "all" ||
    trendTypeBucket != null ||
    phaseInFilter.length > 0 ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    staffFilter !== "all"

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-background/95 via-background/90 to-muted/20",
        "shadow-sm ring-1 ring-border/20",
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/25 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1 space-y-1">
          {trendTypeBucket ? (
            <p className="text-xs text-muted-foreground">
              Trend type group: <span className="font-semibold text-foreground">{trendBucketLabel(trendTypeBucket)}</span>{" "}
              (from link)
            </p>
          ) : null}
          {phaseInFilter.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Phases from link:{" "}
              <span className="font-medium text-foreground">
                {phaseInFilter.map((p) => displayIncidentPhaseShort(p)).join(", ")}
              </span>
            </p>
          ) : null}
        </div>

        {hasFilters
          ? (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              >
                Clear
              </button>
            )
          : null}
      </div>
      <div className="space-y-3 p-3 sm:space-y-3.5 sm:p-4">
        <div>
          <Label className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">Phase</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <FilterChip
              active={phaseFilter === "all"}
              disabled={incidents.length === 0}
              onClick={() => {
                setPhaseFilter("all")
              }}
            >
              All
            </FilterChip>
            {phaseOptions.map((p) => (
              <FilterChip
                key={p}
                active={phaseFilter === p}
                disabled={incidents.length === 0}
                onClick={() => {
                  setPhaseFilter(p)
                }}
                title={p}
              >
                {displayIncidentPhaseShort(p)}
              </FilterChip>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
            Type · quick
          </Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {quickTiles.map((tile) => {
              const isAllTile = tile.key === "all"
              const active = isAllTile
                ? typeFilter === "all"
                : (typeFilter || "").toLowerCase() === String(tile.value).toLowerCase()
              return (
                <FilterChip
                  key={tile.key}
                  active={active}
                  disabled={incidents.length === 0}
                  onClick={() => {
                    if (incidents.length === 0) {
                      return
                    }
                    setTypeFilter(isAllTile ? "all" : String(tile.value))
                  }}
                >
                  {isAllTile ? "All" : displayIncidentType(String(tile.value))}
                </FilterChip>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 min-[500px]:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:min-w-0">
            <Label className="text-xs font-medium" htmlFor="all-inc-type">
              Type
            </Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v)
              }}
            >
              <SelectTrigger id="all-inc-type" className="h-9 w-full min-w-0 border-border/50 bg-background/60 text-sm">
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
          <div className="space-y-1 sm:min-w-0">
            <Label className="text-xs font-medium" htmlFor="all-inc-from">
              From
            </Label>
            <Input
              id="all-inc-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 border-border/50 bg-background/60 text-sm"
            />
          </div>
          <div className="space-y-1 sm:min-w-0">
            <Label className="text-xs font-medium" htmlFor="all-inc-to">
              To
            </Label>
            <Input
              id="all-inc-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 border-border/50 bg-background/60 text-sm"
            />
          </div>
          <div className="space-y-1 sm:min-w-0">
            <Label className="text-xs font-medium" htmlFor="all-inc-staff">
              Reporter
            </Label>
            <Select
              value={staffFilter}
              onValueChange={(v) => {
                setStaffFilter(v)
              }}
            >
              <SelectTrigger id="all-inc-staff" className="h-9 w-full min-w-0 border-border/50 bg-background/60 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
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
    </div>
  )
}
