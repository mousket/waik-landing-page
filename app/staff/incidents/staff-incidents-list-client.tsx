"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { IncidentCompletionIndicator } from "@/components/incidents/incident-completion-indicator"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "lucide-react"
import { PhaseBadge } from "@/components/shared/phase-badge"
import { displayIncidentType, formatIncidentListDate } from "@/lib/incidents/presentation"
import { mapStaffIncidentSummaryToListRow, type IncidentListRow } from "@/lib/types/incident-list-row"
import { cn } from "@/lib/utils"

export function StaffIncidentsListClient() {
  const router = useRouter()
  const [rows, setRows] = useState<IncidentListRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let a = true
    ;(async () => {
      try {
        const r = await fetch("/api/staff/incidents", { credentials: "include" })
        if (!r.ok) {
          if (a) setRows([])
          return
        }
        const d = (await r.json()) as { incidents?: StaffIncidentSummary[] }
        if (a) {
          setRows(Array.isArray(d.incidents) ? d.incidents.map(mapStaffIncidentSummaryToListRow) : [])
        }
      } finally {
        if (a) setLoading(false)
      }
    })()
    return () => {
      a = false
    }
  }, [])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col gap-4 px-4 py-6">
        <PageHeader
          title="My incidents"
          description="Reports you filed, with current phase and completeness."
          actions={
            <Button asChild className="min-h-12 min-w-0 font-semibold shadow-lg shadow-primary/15">
              <Link href="/staff/report">New report</Link>
            </Button>
          }
        />
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No reports yet"
            description="When you file a report, it appears here with phase and next steps."
            actions={
              <Button asChild className="min-h-12 font-semibold shadow-lg shadow-primary/15">
                <Link href="/staff/report">Start a report</Link>
              </Button>
            }
          />
        ) : (
          <ul className="min-w-0 space-y-3">
            {rows.map((inc) => {
              const when = formatIncidentListDate(inc.startedAt)
              return (
                <li key={inc.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/staff/incidents/${inc.id}`)}
                    className={cn(
                      "flex w-full min-h-12 flex-col gap-2 rounded-2xl border border-border/50 bg-card/90 p-4 text-left",
                      "shadow-sm transition hover:bg-muted/30",
                    )}
                  >
                    <div className="flex w-full min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {inc.residentRoom ? `Room ${inc.residentRoom}` : inc.residentName || "Resident"}
                        </p>
                        <p className="text-sm text-muted-foreground">{displayIncidentType(inc.incidentType)}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{when}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PhaseBadge phase={inc.phase} size="sm" />
                      <IncidentCompletionIndicator
                        percent={inc.completenessPercent}
                        label="Done"
                        className="ml-auto"
                      />
                    </div>
                    <span className="text-xs font-medium text-primary">View →</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
