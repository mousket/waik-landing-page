"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, isToday, isYesterday } from "date-fns"
import { readApiErrorMessage } from "@/lib/read-api-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { computeDaysToClose, downloadCsv, generateClosedIncidentsCsv } from "@/lib/utils/csv-export"

function formatLockedDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMM d")
}

function scoreClassName(pct: number): string {
  if (pct >= 85) return "text-primary"
  if (pct >= 60) return "text-amber-600"
  return "text-destructive"
}

function daysToCloseClassName(days: number): string {
  if (days <= 3) return "text-emerald-600"
  if (days <= 7) return "text-amber-600"
  return "text-destructive"
}

export function ClosedInvestigationsTab({
  facilityId,
  organizationId,
}: {
  facilityId?: string
  organizationId?: string
}) {
  const [closedIncidents, setClosedIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const qf = facilityId?.trim() ? `&facilityId=${encodeURIComponent(facilityId.trim())}` : ""
      const qo = organizationId?.trim() ? `&organizationId=${encodeURIComponent(organizationId.trim())}` : ""
      const res = await fetch(`/api/incidents?phase=closed&days=30${qf}${qo}`, { credentials: "include" })
      if (!res.ok) {
        const { message } = await readApiErrorMessage(res, "Could not load closed investigations")
        setLoadError(message)
        setClosedIncidents([])
        return
      }
      setLoadError(null)
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setClosedIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      setLoadError("We could not reach the server for closed investigations.")
      setClosedIncidents([])
    } finally {
      setLoading(false)
    }
  }, [facilityId, organizationId])

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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Room", "Date", "Score", "Investigator", "Days to Close"].map((h) => (
                  <th key={h} className="p-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((k) => (
                <tr key={k} className="border-b border-border/80 last:border-0">
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
      {loadError ? (
        <div
          className="rounded-lg border border-red-200/90 bg-red-50/90 p-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Could not load closed investigations</p>
          <p className="mt-1 text-red-800/90">{loadError}</p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-red-900 underline"
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Closed investigations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {loadError ? "—" : `${sorted.length} investigation${sorted.length === 1 ? "" : "s"} closed in the last 30 days`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px] shrink-0 border-2 border-primary font-semibold text-primary"
          onClick={handleExport}
          disabled={sorted.length === 0 || Boolean(loadError)}
        >
          Export CSV
        </Button>
      </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
              <th className="p-3 font-semibold">Room</th>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Score</th>
              <th className="p-3 font-semibold">Investigator</th>
              <th className="p-3 font-semibold">Days to Close</th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  List failed to load—see the message above.
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No closed investigations in the last 30 days.
                </td>
              </tr>
            ) : (
              sorted.map((inc) => {
                const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
                const days = computeDaysToClose(inc)
                return (
                  <tr key={inc.id} className="border-b border-border/80 last:border-0">
                    <td className="p-3 font-semibold text-primary">{inc.residentRoom}</td>
                    <td className="p-3 text-foreground">{formatLockedDate(inc.phase2LockedAt)}</td>
                    <td className={`p-3 font-medium tabular-nums ${scoreClassName(pct)}`}>{pct}%</td>
                    <td className="p-3 text-foreground">
                      {inc.investigatorName?.trim() ? inc.investigatorName : "—"}
                    </td>
                    <td className="p-3 font-medium tabular-nums">
                      {days == null ? (
                        "—"
                      ) : (
                        <span className={daysToCloseClassName(days)}>
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
