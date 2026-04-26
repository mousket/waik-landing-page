"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { cn } from "@/lib/utils"

type Row = {
  id: string
  residentRoom: string
  assessmentType: string
  status: string
  nextDueAt: string | null
  conductedByName: string
  completenessScore: number
}

const MS_PER_DAY = 86400000

function isStatusTerminal(status: string): boolean {
  const s = status.toLowerCase()
  return s.includes("complete") || s.includes("done") || s.includes("closed")
}

function nextDueUrgency(nextDueAt: string | null, status: string): "none" | "overdue" | "due_soon" {
  if (!nextDueAt || isStatusTerminal(status)) return "none"
  const t = new Date(nextDueAt).getTime()
  const now = Date.now()
  if (t < now) return "overdue"
  if (t - now <= 7 * MS_PER_DAY) return "due_soon"
  return "none"
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes("complete") || s.includes("done") || s.includes("closed")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
  }
  if (s.includes("overdue") || s.includes("late")) {
    return "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  }
  if (s.includes("pending") || s.includes("due") || s.includes("open")) {
    return "border-primary/40 bg-primary/5 text-foreground"
  }
  return "border-border text-muted-foreground"
}

export default function AdminAssessmentsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments${apiCtx}`, { credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Could not load assessments")
        setRows([])
        return
      }
      const j = (await res.json()) as { assessments?: Row[] }
      setRows(j.assessments ?? [])
    } catch {
      setError("Could not load assessments")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:py-10">
        <PageHeader
          className="mb-6"
          title="Assessments"
          description="Assessment records for the selected facility."
        />
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <WaikCard>
            <WaikCardContent className="space-y-3 p-6">
              <Skeleton className="h-8 w-1/3" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </WaikCardContent>
          </WaikCard>
        ) : (
          <WaikCard>
            <WaikCardContent className="space-y-0 p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Next due</th>
                      <th className="px-4 py-3">By</th>
                      <th className="px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No assessment records for this facility.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const urgency = nextDueUrgency(r.nextDueAt, r.status)
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 font-medium">{r.residentRoom || "—"}</td>
                            <td className="px-4 py-3 capitalize">{r.assessmentType.replace(/_/g, " ")}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn("font-normal capitalize", statusBadgeClass(r.status))}
                              >
                                {r.status.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.nextDueAt ? (
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                  <span className="whitespace-nowrap text-foreground/90">
                                    {new Date(r.nextDueAt).toLocaleString()}
                                  </span>
                                  {urgency === "overdue" ? (
                                    <Badge
                                      variant="outline"
                                      className="w-fit border-amber-500/50 text-xs font-normal text-amber-800 dark:text-amber-200"
                                    >
                                      Overdue
                                    </Badge>
                                  ) : null}
                                  {urgency === "due_soon" ? (
                                    <Badge
                                      variant="outline"
                                      className="w-fit border-primary/40 text-xs font-normal text-primary"
                                    >
                                      Due soon
                                    </Badge>
                                  ) : null}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3">{r.conductedByName || "—"}</td>
                            <td className="px-4 py-3 tabular-nums">{r.completenessScore ?? "—"}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </WaikCardContent>
          </WaikCard>
        )}
      </div>
    </div>
  )
}
