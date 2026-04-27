"use client"

import type { Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { useHydrationSafeRelativeTime } from "@/hooks/use-hydration-safe-relative-time"
import { buildAdminIncidentsApiPath, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IdtSendReminderButton } from "@/components/admin/idt-send-reminder-button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { IdtTeamMember, IncidentSummary } from "@/lib/types/incident-summary"
import { classifyIncident, isIdtOverdue } from "@/lib/utils/incident-classification"

/** ~12% wider than prior 10.25rem min column for more breathing room. */
const IMMEDIATE_ACTION_GRID =
  "grid w-full [grid-template-columns:repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-2"

function ImmediateActionRedCard({
  inc,
  canAccessPhase2,
  claimingId,
  fadingOutId,
  searchParams,
  onClaim,
}: {
  inc: IncidentSummary
  canAccessPhase2: boolean
  claimingId: string | null
  fadingOutId: string | null
  searchParams: URLSearchParams
  onClaim: (inc: IncidentSummary) => void
}) {
  const typeLabel = formatIncidentType(inc.incidentType)
  const timeAgo = useHydrationSafeRelativeTime(inc.startedAt)

  const cta =
    inc.phase === "phase_1_complete" && canAccessPhase2 ? (
      <Button
        className="mt-2 h-7 w-full min-h-0 gap-1 border border-primary/20 bg-primary/90 px-2 text-[11px] font-semibold text-primary-foreground shadow-none hover:bg-primary"
        type="button"
        disabled={claimingId === inc.id}
        onClick={() => onClaim(inc)}
      >
        {claimingId === inc.id ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Claiming</span>
          </>
        ) : (
          <>
            <span>Claim</span>
            <ArrowUpRight className="h-3 w-3 opacity-80" aria-hidden />
          </>
        )}
      </Button>
    ) : inc.phase === "phase_1_in_progress" ? (
      <Button
        asChild
        className="mt-2 h-7 w-full min-h-0 gap-0.5 border border-primary/30 bg-card px-2 text-[11px] font-semibold text-primary shadow-sm hover:bg-primary/5"
        variant="outline"
      >
        <Link href={buildAdminPathWithContext(`/admin/incidents/${inc.id}`, searchParams)} className="inline-flex w-full items-center justify-center gap-0.5">
          Phase 1
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </Button>
    ) : (
      <Button
        asChild
        className="mt-2 h-7 w-full min-h-0 gap-0.5 border border-primary/30 bg-card px-2 text-[11px] font-semibold text-primary shadow-sm hover:bg-primary/5"
        variant="outline"
      >
        <Link href={buildAdminPathWithContext(`/admin/incidents/${inc.id}`, searchParams)} className="inline-flex w-full items-center justify-center gap-0.5">
          Open
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </Button>
    )

  return (
    <div
      className={cn(
        "group relative flex min-h-[132px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-red-200/50 bg-gradient-to-b from-card to-red-50/[0.35] p-2 pl-2.5 shadow-sm ring-1 ring-red-500/[0.08] transition-[box-shadow,opacity,transform] duration-200 will-change-transform",
        "hover:-translate-y-px hover:ring-red-500/20",
        fadingOutId === inc.id && "opacity-0",
      )}
    >
      <span
        className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-red-500 to-red-700"
        aria-hidden
      />
      <div className="min-w-0 pl-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="min-w-0 text-xs font-extrabold leading-tight text-primary tabular-nums sm:text-sm">
            {inc.residentName || "Unknown"}
          </p>
          <time
            className="shrink-0 text-[10px] font-medium leading-tight text-muted-foreground/90"
            dateTime={inc.startedAt}
          >
            {timeAgo}
          </time>
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          Room {inc.residentRoom}
        </p>
        <p className="mt-1.5 min-h-9 line-clamp-2 text-xs font-medium leading-snug text-foreground/95 sm:min-h-10">
          {typeLabel}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-amber-800/95">
          {inc.hasInjury ? "Injury" : "No injury reported"}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
          Reported by {inc.reportedByName} · {inc.reportedByRole}
        </p>
      </div>
      {cta}
    </div>
  )
}

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function AwaitingRelativeTime({ startedAt }: { startedAt: string }) {
  const t = useHydrationSafeRelativeTime(startedAt)
  return <span className="shrink-0 text-[10px] text-muted-foreground sm:text-xs">{t}</span>
}

type OverdueIdtTask = {
  incident: IncidentSummary
  member: IdtTeamMember
  /** Whole hours beyond the 24h response threshold. */
  hoursOverdue: number
}

export function NeedsAttentionTab({
  canAccessPhase2,
  onAttentionCount,
  sharedIncidents,
  sharedLoading,
  setSharedIncidents,
}: {
  canAccessPhase2: boolean
  onAttentionCount: (n: number) => void
  /** Dashboard shell passes one shared list + setter so Active tab does not refetch (task-06g). */
  sharedIncidents?: IncidentSummary[]
  sharedLoading?: boolean
  setSharedIncidents?: Dispatch<SetStateAction<IncidentSummary[]>>
}) {
  const searchParams = useAdminUrlSearchParams()
  const [localIncidents, setLocalIncidents] = useState<IncidentSummary[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [fadingOutId, setFadingOutId] = useState<string | null>(null)

  const parentMode = sharedIncidents !== undefined && setSharedIncidents !== undefined
  const incidents = parentMode ? sharedIncidents! : localIncidents
  const setIncidents = parentMode ? setSharedIncidents! : setLocalIncidents
  const loading = parentMode ? Boolean(sharedLoading) : localLoading

  const attentionApiUrl = useMemo(
    () =>
      buildAdminIncidentsApiPath(searchParams, {
        phase: "phase_1_in_progress,phase_1_complete,phase_2_in_progress",
      }),
    [searchParams],
  )

  const load = useCallback(async () => {
    setLocalLoading(true)
    try {
      const res = await fetch(attentionApiUrl, { credentials: "include" })
      if (!res.ok) {
        toast.error("Could not load incidents")
        setLocalIncidents([])
        return
      }
      const data = (await res.json()) as { incidents?: IncidentSummary[] }
      setLocalIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      toast.error("Could not load incidents")
      setLocalIncidents([])
    } finally {
      setLocalLoading(false)
    }
  }, [attentionApiUrl])

  useEffect(() => {
    if (parentMode) return
    void load()
  }, [parentMode, load])

  const { redAlerts, yellowAwaiting, overdueIdtTasks } = useMemo(() => {
    const red: IncidentSummary[] = []
    const yellow: IncidentSummary[] = []
    const overdueTasks: OverdueIdtTask[] = []
    const nowMs = Date.now()

    for (const inc of incidents) {
      const u = classifyIncident(inc)
      if (u === "red_alert") red.push(inc)
      else if (u === "yellow_awaiting") yellow.push(inc)
    }

    for (const inc of incidents) {
      if (inc.phase !== "phase_2_in_progress") continue
      for (const m of inc.idtTeam) {
        if (!isIdtOverdue(m, nowMs) || !m.questionSentAt) continue
        const sentMs = new Date(m.questionSentAt).getTime()
        const hoursElapsed = (nowMs - sentMs) / (1000 * 60 * 60)
        overdueTasks.push({
          incident: inc,
          member: m,
          hoursOverdue: Math.max(0, Math.floor(hoursElapsed - 24)),
        })
      }
    }

    overdueTasks.sort((a, b) => b.hoursOverdue - a.hoursOverdue)

    return { redAlerts: red, yellowAwaiting: yellow, overdueIdtTasks: overdueTasks }
  }, [incidents])

  const attentionTotal = redAlerts.length + yellowAwaiting.length + overdueIdtTasks.length

  useEffect(() => {
    onAttentionCount(attentionTotal)
  }, [attentionTotal, onAttentionCount])

  async function claimInvestigation(incident: IncidentSummary) {
    if (!canAccessPhase2) {
      toast.error("Your role cannot claim Phase 2 investigations.")
      return
    }
    setClaimingId(incident.id)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phase: "phase_2_in_progress" }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(typeof j.error === "string" ? j.error : "Could not claim investigation")
        return
      }
      setFadingOutId(incident.id)
      window.setTimeout(() => {
        setFadingOutId(null)
        setIncidents((prev) => prev.filter((i) => i.id !== incident.id))
      }, 300)
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className={cn(IMMEDIATE_ACTION_GRID, "min-h-[8rem]")}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <Skeleton key={k} className="h-[128px] w-full min-w-0 rounded-lg" />
        ))}
      </div>
    )
  }

  const empty = redAlerts.length === 0 && yellowAwaiting.length === 0 && overdueIdtTasks.length === 0

  if (empty) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            No immediate action needed. Your community is on track.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {redAlerts.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-red-200/50 bg-gradient-to-b from-red-50/40 to-transparent p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5 sm:px-0">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-900/80">
              Immediate action
            </h2>
            <span
              className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-sm"
              aria-label={`${redAlerts.length} incident${redAlerts.length === 1 ? "" : "s"}`}
            >
              {redAlerts.length}
            </span>
          </div>
          <div className={IMMEDIATE_ACTION_GRID} role="list">
            {redAlerts.map((inc) => (
              <div key={inc.id} role="listitem" className="min-w-0">
                <ImmediateActionRedCard
                  inc={inc}
                  canAccessPhase2={canAccessPhase2}
                  claimingId={claimingId}
                  fadingOutId={fadingOutId}
                  searchParams={searchParams}
                  onClaim={(i) => void claimInvestigation(i)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {yellowAwaiting.length > 0 ? (
        <section className="space-y-3">
          <h2 className="sticky top-0 z-10 -mx-1 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-50/40 px-1 pb-2 text-xs font-bold uppercase tracking-wider text-amber-900 backdrop-blur-sm">
            Awaiting claim
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {yellowAwaiting.map((inc) => (
              <div
                key={inc.id}
                className={cn(
                  "flex min-h-[132px] flex-col justify-between rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-50/40 p-3 shadow-sm transition-opacity duration-300 hover:ring-1 hover:ring-amber-200/60",
                  fadingOutId === inc.id && "opacity-0",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold leading-snug text-foreground">
                    {inc.residentName || "Resident"} · Rm {inc.residentRoom}
                  </p>
                  <AwaitingRelativeTime startedAt={inc.startedAt} />
                </div>
                <p className="mt-1.5 text-xs font-semibold text-primary">
                  {Math.round(inc.completenessAtSignoff || inc.completenessScore)}% complete
                </p>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                  Reported by {inc.reportedByName} · {inc.reportedByRole}
                </p>
                {canAccessPhase2 ? (
                  <Button
                    variant="outline"
                    className="mt-3 h-9 w-full min-h-0 gap-1 border-amber-600 text-xs font-semibold"
                    type="button"
                    disabled={claimingId === inc.id}
                    onClick={() => void claimInvestigation(inc)}
                  >
                    {claimingId === inc.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Claiming…
                      </>
                    ) : (
                      <>
                        Claim
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Only the DON or administrator can claim Phase 2.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {overdueIdtTasks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="sticky top-0 z-10 -mx-1 border-b border-border/60 bg-gradient-to-b from-background/95 to-background/50 px-1 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            Overdue IDT tasks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overdueIdtTasks.map(({ incident: inc, member: m, hoursOverdue }) => (
              <div
                key={`${inc.id}-${m.userId}`}
                className="flex min-h-0 flex-col rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <Badge
                    variant="secondary"
                    className="h-5 shrink-0 rounded-full border-0 bg-primary px-1.5 py-0 text-[10px] font-medium text-primary-foreground"
                  >
                    {formatRole(m.role)}
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-foreground">
                  Rm {inc.residentRoom} · {formatIncidentType(inc.incidentType)}
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-800">
                  {hoursOverdue}h over 24h response window
                </p>
                <IdtSendReminderButton
                  targetUserId={m.userId}
                  incidentId={inc.id}
                  residentRoom={inc.residentRoom}
                  incidentTypeLabel={formatIncidentType(inc.incidentType)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
