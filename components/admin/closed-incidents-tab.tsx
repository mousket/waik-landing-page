"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, isToday, isYesterday } from "date-fns"
import { toast } from "sonner"
import { brand } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { computeDaysToClose, downloadCsv, generateClosedIncidentsCsv } from "@/lib/utils/csv-export"

const RED = "#C0392B"
const AMBER = "#E8A838"
const DAYS_GREEN = "#059669"

function formatLockedDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMM d")
}

function scoreColor(pct: number): string {
  if (pct >= 85) return brand.teal
  if (pct >= 60) return AMBER
  return RED
}

function daysToCloseColor(days: number): string {
  if (days <= 3) return DAYS_GREEN
  if (days <= 7) return AMBER
  return RED
}

export function ClosedInvestigationsTab({ facilityId }: { facilityId?: string }) {
  const [closedIncidents, setClosedIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = facilityId?.trim() ? `&facilityId=${encodeURIComponent(facilityId.trim())}` : ""
      const res = await fetch(`/api/incidents?phase=closed&days=30${q}`, { credentials: "include" })
      if (!res.ok) {
        toast.error("Could not load closed investigations")
        setClosedIncidents([])
        return
      }
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setClosedIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      toast.error("Could not load closed investigations")
      setClosedIncidents([])
    } finally {
      setLoading(false)
    }
  }, [facilityId])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    return [...closedIncidents].sort((a, b) => {
      const ta = a.phase2LockedAt ? new Date(a.phase2LockedAt).getTime() : 0
      const tb = b.phase2LockedAt ? new Date(b.phase2LockedAt).getTime() : 0
      return tb - ta
    })
  }, [closedIncidents])

  const handleExport = () => {
    const today = format(new Date(), "yyyy-MM-dd")
    const csv = generateClosedIncidentsCsv(sorted)
    downloadCsv(csv, `waik-closed-incidents-${today}.csv`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-12 w-36 rounded-md" />
        </div>
        <div className="overflow-x-auto rounded-xl border border-brand-mid-gray bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-mid-gray bg-brand-light-bg/50">
                {["Room", "Date", "Score", "Investigator", "Days to Close"].map((h) => (
                  <th key={h} className="p-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((k) => (
                <tr key={k} className="border-b border-brand-mid-gray/80 last:border-0">
                  <td className="p-3">
                    <Skeleton className="h-5 w-12" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-5 w-10" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-5 w-32" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-5 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-dark-teal">Closed investigations</h3>
          <p className="mt-1 text-sm text-brand-muted">
            {sorted.length} investigation{sorted.length === 1 ? "" : "s"} closed in the last 30 days
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px] shrink-0 border-2 border-brand-teal font-semibold text-brand-teal"
          onClick={handleExport}
          disabled={sorted.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-mid-gray bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-mid-gray bg-brand-light-bg/50">
              <th className="p-3 font-semibold">Room</th>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Score</th>
              <th className="p-3 font-semibold">Investigator</th>
              <th className="p-3 font-semibold">Days to Close</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-brand-muted">
                  No closed investigations in the last 30 days.
                </td>
              </tr>
            ) : (
              sorted.map((inc) => {
                const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
                const days = computeDaysToClose(inc)
                return (
                  <tr key={inc.id} className="border-b border-brand-mid-gray/80 last:border-0">
                    <td className="p-3 font-semibold" style={{ color: brand.teal }}>
                      {inc.residentRoom}
                    </td>
                    <td className="p-3 text-brand-body">{formatLockedDate(inc.phase2LockedAt)}</td>
                    <td className="p-3 font-medium tabular-nums" style={{ color: scoreColor(pct) }}>
                      {pct}%
                    </td>
                    <td className="p-3 text-brand-body">{inc.investigatorName?.trim() ? inc.investigatorName : "—"}</td>
                    <td className="p-3 font-medium tabular-nums">
                      {days == null ? (
                        "—"
                      ) : (
                        <span style={{ color: daysToCloseColor(days) }}>
                          {days} day{days === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
