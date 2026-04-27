"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, isToday, isYesterday } from "date-fns"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { readApiErrorMessage } from "@/lib/read-api-error"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight } from "lucide-react"
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
  const searchParams = useAdminUrlSearchParams()
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
    <div className="space-y-3">
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
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2 rounded-lg border border-border/60 bg-card/90 px-2 py-2 backdrop-blur sm:-mx-1 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Last 30 days</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {loadError
              ? "—"
              : `${sorted.length} closed investigation${sorted.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-h-0 shrink-0 border-primary/50 text-sm font-semibold text-primary"
          onClick={handleExport}
          disabled={sorted.length === 0 || Boolean(loadError)}
        >
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card/60">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            <tr>
              <th className="p-2.5 pl-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3">
                Room
              </th>
              <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3">
                Closed
              </th>
              <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3">
                Score
              </th>
              <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3">
                Investigator
              </th>
              <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-3">
                Days to close
              </th>
              <th className="w-[1%] p-2.5 pr-3 sm:p-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground sm:p-8">
                  List failed to load—see the message above.
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground sm:p-8">
                  No closed investigations in the last 30 days.
                </td>
              </tr>
            ) : (
              sorted.map((inc) => {
                const pct = Math.round(inc.completenessAtSignoff ?? inc.completenessScore ?? 0)
                const days = computeDaysToClose(inc)
                return (
                  <tr
                    key={inc.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/20"
                  >
                    <td className="p-2.5 pl-3 align-middle font-semibold text-primary sm:p-3">
                      {inc.residentRoom}
                    </td>
                    <td className="p-2.5 align-middle text-foreground sm:p-3">{formatLockedDate(inc.phase2LockedAt)}</td>
                    <td className={`p-2.5 align-middle text-xs font-medium tabular-nums sm:text-sm sm:p-3 ${scoreClassName(pct)}`}>
                      {pct}%
                    </td>
                    <td className="max-w-[10rem] truncate p-2.5 align-middle text-foreground sm:max-w-none sm:p-3">
                      {inc.investigatorName?.trim() ? inc.investigatorName : "—"}
                    </td>
                    <td className="p-2.5 align-middle text-xs font-medium tabular-nums sm:text-sm sm:p-3">
                      {days == null ? (
                        "—"
                      ) : (
                        <span className={daysToCloseClassName(days)}>
                          {days} d
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 pr-3 align-middle sm:p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 min-h-0 gap-0.5 px-2 text-xs font-semibold text-primary"
                        asChild
                      >
                        <Link
                          href={buildAdminPathWithContext(
                            `/admin/incidents/${encodeURIComponent(inc.id)}`,
                            searchParams,
                          )}
                        >
                          View
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
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
