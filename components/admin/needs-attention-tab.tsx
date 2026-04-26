"use client"

import type { Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { brand } from "@/lib/design-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IdtSendReminderButton } from "@/components/admin/idt-send-reminder-button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { IdtTeamMember, IncidentSummary } from "@/lib/types/incident-summary"
import { classifyIncident, isIdtOverdue } from "@/lib/utils/incident-classification"

const RED = "#C0392B"
const RED_BG = "#FDE8E8"
const YELLOW_BORDER = "#E8A838"
const IDT_OVERDUE_BG = "#FBF0D9"

const ATTENTION_PHASES_QUERY =
  "/api/incidents?phase=phase_1_in_progress,phase_1_complete,phase_2_in_progress"

function formatIncidentType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
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
  const [localIncidents, setLocalIncidents] = useState<IncidentSummary[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [fadingOutId, setFadingOutId] = useState<string | null>(null)

  const parentMode = sharedIncidents !== undefined && setSharedIncidents !== undefined
  const incidents = parentMode ? sharedIncidents! : localIncidents
  const setIncidents = parentMode ? setSharedIncidents! : setLocalIncidents
  const loading = parentMode ? Boolean(sharedLoading) : localLoading

  const load = useCallback(async () => {
    setLocalLoading(true)
    try {
      const res = await fetch(ATTENTION_PHASES_QUERY, { credentials: "include" })
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
  }, [])

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
      <div className="space-y-3">
        {[0, 1, 2].map((k) => (
          <Skeleton key={k} className="h-[140px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const empty = redAlerts.length === 0 && yellowAwaiting.length === 0 && overdueIdtTasks.length === 0

  if (empty) {
    return (
      <div
        className="rounded-xl border-l-4 bg-brand-light-bg p-6 shadow-sm"
        style={{ borderLeftColor: brand.teal }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-sm font-medium text-brand-body">
            No immediate action needed. Your community is on track.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {redAlerts.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#C0392B]">
            Immediate Action Required
          </h2>
          <div className="space-y-3">
            {redAlerts.map((inc) => (
              <div
                key={inc.id}
                className={cn(
                  "rounded-xl border-l-4 p-4 transition-opacity duration-300",
                  fadingOutId === inc.id && "opacity-0",
                )}
                style={{ borderLeftColor: RED, backgroundColor: RED_BG }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-brand-body">
                    Room {inc.residentRoom} — {formatIncidentType(inc.incidentType)}
                  </p>
                  <Badge className="shrink-0" style={{ backgroundColor: RED, color: "#fff" }}>
                    {formatDistanceToNow(new Date(inc.startedAt), { addSuffix: true })}
                  </Badge>
                </div>
                {inc.hasInjury ? (
                  <p className="mt-2 text-sm" style={{ color: brand.accent }}>
                    Injury reported — state notification may be required
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-brand-muted">
                  Reported by: {inc.reportedByName}, {inc.reportedByRole}
                </p>
                {inc.phase === "phase_1_complete" && canAccessPhase2 ? (
                  <Button
                    className="mt-4 h-auto min-h-[48px] w-full font-semibold text-white sm:w-auto sm:min-w-[200px]"
                    style={{ backgroundColor: brand.teal }}
                    type="button"
                    disabled={claimingId === inc.id}
                    onClick={() => void claimInvestigation(inc)}
                  >
                    {claimingId === inc.id ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Claiming…
                      </>
                    ) : (
                      "Claim Investigation"
                    )}
                  </Button>
                ) : inc.phase === "phase_1_in_progress" ? (
                  <Button
                    asChild
                    className="mt-4 h-auto min-h-[48px] w-full font-semibold sm:w-auto sm:min-w-[200px]"
                    variant="outline"
                    style={{ borderColor: brand.teal, color: brand.darkTeal }}
                  >
                    <Link href={`/admin/incidents/${inc.id}`}>Continue Phase 1 report</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="mt-4 h-auto min-h-[48px] w-full font-semibold sm:w-auto sm:min-w-[200px]"
                    variant="outline"
                    style={{ borderColor: brand.teal, color: brand.darkTeal }}
                  >
                    <Link href={`/admin/incidents/${inc.id}`}>View investigation</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {yellowAwaiting.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark-teal">
            Awaiting Investigation Claim
          </h2>
          <div className="space-y-3">
            {yellowAwaiting.map((inc) => (
              <div
                key={inc.id}
                className={cn(
                  "rounded-xl border-l-4 p-4 transition-opacity duration-300",
                  fadingOutId === inc.id && "opacity-0",
                )}
                style={{ borderLeftColor: YELLOW_BORDER, backgroundColor: brand.warnBg }}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-brand-body">
                    Room {inc.residentRoom} — {formatIncidentType(inc.incidentType)}
                  </p>
                  <span className="text-sm text-brand-muted">
                    {formatDistanceToNow(new Date(inc.startedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-brand-body">
                  {Math.round(inc.completenessAtSignoff || inc.completenessScore)}% complete
                </p>
                {canAccessPhase2 ? (
                  <Button
                    variant="outline"
                    className="mt-3 min-h-[48px] border-2 font-semibold"
                    style={{ borderColor: brand.accent, color: brand.darkTeal }}
                    type="button"
                    disabled={claimingId === inc.id}
                    onClick={() => void claimInvestigation(inc)}
                  >
                    {claimingId === inc.id ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Claiming…
                      </>
                    ) : (
                      "Claim"
                    )}
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-brand-muted">Only the DON or administrator can claim Phase 2.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {overdueIdtTasks.length > 0 ? (
        <section>
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-brand-muted">
            Overdue IDT Tasks
          </h2>
          <div className="space-y-2">
            {overdueIdtTasks.map(({ incident: inc, member: m, hoursOverdue }) => (
              <div
                key={`${inc.id}-${m.userId}`}
                className="rounded-xl border-l-4 p-4"
                style={{ borderLeftColor: YELLOW_BORDER, backgroundColor: IDT_OVERDUE_BG }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-body">{m.name}</p>
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded-full border-0 px-2 py-0 text-xs font-medium text-white"
                    style={{ backgroundColor: brand.teal }}
                  >
                    {formatRole(m.role)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-brand-body">
                  Room {inc.residentRoom} — {formatIncidentType(inc.incidentType)}
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: YELLOW_BORDER }}>
                  {hoursOverdue} hour{hoursOverdue === 1 ? "" : "s"} overdue
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
