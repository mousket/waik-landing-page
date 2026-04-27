"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addHours, differenceInHours, differenceInMinutes, parseISO } from "date-fns"
import { canAccessPhase2 } from "@/lib/waik-roles"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { getDisplayNarrative, getRawNarrative } from "@/lib/utils/enhance-narrative"
import { renderMarkdownOrHtml } from "@/lib/utils/markdown-to-html"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { PageHeader } from "@/components/ui/page-header"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle2, ChevronDown, Lock, LockOpen, Circle } from "lucide-react"
import { toast } from "sonner"
import type { Incident, IncidentPhase2Sections, Phase2SectionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Phase2IdtTab } from "@/components/admin/phase2-idt-tab"

const Phase2ResidentContextTab = dynamic(
  () => import("@/components/admin/phase2-resident-context-tab").then((m) => m.Phase2ResidentContextTab),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">
        <span className="inline-block animate-pulse">Loading resident context…</span>
      </p>
    ),
  },
)

const SECTIONS: Array<{
  key: keyof IncidentPhase2Sections
  param: string
  label: string
}> = [
  { key: "contributingFactors", param: "contributing-factors", label: "Contributing factors" },
  { key: "rootCause", param: "root-cause", label: "Root cause" },
  { key: "interventionReview", param: "intervention-review", label: "Intervention review" },
  { key: "newIntervention", param: "new-intervention", label: "New intervention" },
]

function statusDotClass(s: Phase2SectionStatus) {
  if (s === "complete") {
    return "bg-teal-500"
  }
  if (s === "in_progress") {
    return "bg-amber-400"
  }
  return "bg-muted-foreground/40"
}

type Props = {
  incident: Incident
  incidentId: string
  searchParams: URLSearchParams
  onRefresh: () => Promise<void>
  waikRole: string | null
  isWaikSuperAdmin: boolean
}

export function Phase2InvestigationShell({
  incident: inc,
  incidentId,
  searchParams,
  onRefresh,
  waikRole,
  isWaikSuperAdmin,
}: Props) {
  const router = useRouter()
  const apiQ = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const canP2 = isWaikSuperAdmin || canAccessPhase2(waikRole ?? "")
  const [claiming, setClaiming] = useState(false)
  const [unlockText, setUnlockText] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [p1view, setP1view] = useState<"raw" | "both">("both")
  const [auditOpen, setAuditOpen] = useState(false)

  const p2 = inc.phase2Sections
  const phase1Signed = inc.phaseTransitionTimestamps?.phase1Signed
  const deadline = useMemo(() => {
    if (!phase1Signed) {
      return null
    }
    try {
      const t = parseISO(phase1Signed)
      return addHours(t, 48)
    } catch {
      return null
    }
  }, [phase1Signed])

  const hoursLeft = useMemo(() => {
    if (!deadline) {
      return null
    }
    return differenceInHours(deadline, new Date(), { roundingMethod: "ceil" })
  }, [deadline])

  const clockClass = useMemo(() => {
    if (hoursLeft == null) {
      return "text-muted-foreground"
    }
    if (hoursLeft < 0) {
      return "font-bold text-destructive"
    }
    if (hoursLeft < 6) {
      return "font-medium text-destructive"
    }
    if (hoursLeft <= 24) {
      return "text-amber-600"
    }
    return "text-muted-foreground"
  }, [hoursLeft])

  const unclaimedP2 = inc.phase === "phase_1_complete" && !inc.investigatorId

  const displayNarrative = getDisplayNarrative(inc)
  const rawNarrative = getRawNarrative(inc)
  const displayHtml = renderMarkdownOrHtml(displayNarrative)
  const rawHtml = renderMarkdownOrHtml(rawNarrative)

  const allComplete =
    p2?.contributingFactors?.status === "complete" &&
    p2?.rootCause?.status === "complete" &&
    p2?.interventionReview?.status === "complete" &&
    p2?.newIntervention?.status === "complete"

  const claim = useCallback(async () => {
    setClaiming(true)
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(incidentId)}/phase${apiQ}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "phase_2_in_progress" }),
          credentials: "include",
        },
      )
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not claim investigation")
        return
      }
      await onRefresh()
      toast.success("Investigation claimed. Phase 2 is now in progress.")
    } finally {
      setClaiming(false)
    }
  }, [apiQ, incidentId, onRefresh])

  const unlock = useCallback(async () => {
    if (unlockText.trim().length < 20) {
      toast.error("Reason must be at least 20 characters.")
      return
    }
    setUnlocking(true)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/unlock${apiQ}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unlockText.trim() }),
        credentials: "include",
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Unlock failed")
        return
      }
      setUnlockText("")
      await onRefresh()
      toast.success("Investigation unlocked. Signatures have been cleared.")
    } finally {
      setUnlocking(false)
    }
  }, [apiQ, incidentId, onRefresh, unlockText])

  if (!canP2) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          Your role does not have access to the Phase 2 investigation workspace.
        </p>
        <Button variant="secondary" onClick={() => router.push(buildAdminPathWithContext("/admin/incidents", searchParams))}>
          Back to incidents
        </Button>
      </div>
    )
  }

  if (unclaimedP2) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center">
        <Lock className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">Claim this investigation</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Claiming assigns you as investigator and opens Phase 2. Tabs stay locked until you claim.
        </p>
        <Button size="lg" onClick={() => void claim()} disabled={claiming}>
          {claiming ? "Claiming…" : "Claim investigation"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(buildAdminPathWithContext("/admin/incidents", searchParams))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="relative flex-1 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => router.push(buildAdminPathWithContext("/admin/incidents", searchParams))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Incidents
          </Button>
          {deadline && hoursLeft != null && (
            <p className={cn("text-sm tabular-nums", clockClass)} title="Hours remaining until 48h from Phase 1 sign-off">
              48h clock: {hoursLeft < 0 ? "Overdue " : ""}
              {Math.abs(hoursLeft)}h left
              {hoursLeft < 0 ? ` (${differenceInMinutes(new Date(), deadline)} min past)` : ""}
            </p>
          )}
        </div>

        <PageHeader
          title={`${(inc.incidentType ?? "Incident") as string} — Room ${inc.residentRoom}`}
          description={
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{inc.phase === "closed" ? "Closed" : inc.phase?.replace(/_/g, " ") ?? ""}</Badge>
              {inc.investigatorName ? <span className="text-xs text-muted-foreground">Investigator: {inc.investigatorName}</span> : null}
            </div>
          }
        />

        {inc.phase === "closed" ? (
          <WaikCard className="border-amber-200/80 bg-amber-50/50">
            <WaikCardContent className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-amber-900">
                <CheckCircle2 className="h-4 w-4" />
                This investigation is locked. Contact DON or an administrator to unlock.
              </div>
              {canP2 && (
                <div className="flex flex-1 flex-col gap-1 sm:max-w-md">
                  <Textarea
                    value={unlockText}
                    onChange={(e) => setUnlockText(e.target.value)}
                    placeholder="Reason for unlock (at least 20 characters)…"
                    className="min-h-[72px] text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300"
                    onClick={() => void unlock()}
                    disabled={unlocking}
                  >
                    <LockOpen className="mr-1 h-3.5 w-3.5" />
                    {unlocking ? "Unlocking…" : "Unlock investigation"}
                  </Button>
                </div>
              )}
            </WaikCardContent>
          </WaikCard>
        ) : null}

        <WaikCard>
          <WaikCardContent className="p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Reporting nurse</p>
                <p className="font-medium">{inc.staffName}</p>
              </div>
              {typeof inc.completenessScore === "number" && (
                <div>
                  <p className="text-xs text-muted-foreground">Phase 1 completeness</p>
                  <p className="font-mono text-lg font-semibold">{inc.completenessScore}%</p>
                </div>
              )}
              {phase1Signed && (
                <div>
                  <p className="text-xs text-muted-foreground">Phase 1 sign-off</p>
                  <p className="text-xs">{new Date(phase1Signed).toLocaleString()}</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Section progress</p>
            <div className="mt-1 flex items-center gap-1.5">
              {SECTIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-0.5" title={label}>
                  <span className={cn("h-2.5 w-2.5 rounded-full", statusDotClass(p2?.[key]?.status ?? "not_started"))} />
                </div>
              ))}
            </div>
            {allComplete && inc.phase !== "closed" && (
              <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground">All sections complete. Ready for sign-off.</p>
                <Button asChild size="sm" className="w-fit">
                  <Link
                    href={buildAdminPathWithContext(`/admin/incidents/${incidentId}/signoff`, searchParams)}
                  >
                    Go to sign-off
                  </Link>
                </Button>
              </div>
            )}
          </WaikCardContent>
        </WaikCard>

        {inc.auditTrail && inc.auditTrail.length > 0 && (
          <div className="space-y-1">
            <Button
              type="button"
              variant="ghost"
              className="flex w-full justify-between text-xs"
              size="sm"
              onClick={() => setAuditOpen((o) => !o)}
            >
              Investigation history
              <ChevronDown className={cn("h-3 w-3 transition", auditOpen && "rotate-180")} />
            </Button>
            {auditOpen ? (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-border/50 bg-muted/20 p-2 text-xs">
                {inc.auditTrail.map((a, i) => (
                  <li key={i} className="list-disc pl-3">
                    <span className="font-medium">{a.action}</span>
                    {a.performedByName ? ` — ${a.performedByName}` : null}
                    {` · ${new Date(a.timestamp).toLocaleString()}`}
                    {a.reason ? <span className="block pl-0 text-muted-foreground">{a.reason}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <Tabs defaultValue="p1" className="w-full">
          <TabsList className="h-auto w-full flex-wrap sm:flex-nowrap">
            <TabsTrigger value="p1" className="text-xs sm:text-sm">
              Phase 1 record
            </TabsTrigger>
            <TabsTrigger value="idt" className="text-xs sm:text-sm">
              IDT & questions
            </TabsTrigger>
            <TabsTrigger value="sec" className="text-xs sm:text-sm">
              Investigation sections
            </TabsTrigger>
            <TabsTrigger value="res" className="text-xs sm:text-sm" disabled={!inc.residentId}>
              Resident context
            </TabsTrigger>
          </TabsList>
          <TabsContent value="p1" className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={p1view === "both" ? "default" : "outline"} onClick={() => setP1view("both")}>
                Both
              </Button>
              <Button type="button" size="sm" variant={p1view === "raw" ? "default" : "outline"} onClick={() => setP1view("raw")}>
                Original only
              </Button>
            </div>
            {p1view === "raw" && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Preserved exactly as spoken / recorded</p>
                <div
                  className="rounded border border-dashed p-3 text-sm incident-enhanced-html"
                  dangerouslySetInnerHTML={{ __html: rawHtml ?? "" }}
                />
              </div>
            )}
            {p1view === "both" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Staff&apos;s original words</p>
                  <div
                    className="mt-1 rounded border border-dashed p-2 text-sm incident-enhanced-html"
                    dangerouslySetInnerHTML={{ __html: rawHtml ?? "" }}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Official clinical record (enhanced)</p>
                  <div
                    className="mt-1 rounded border p-2 text-sm incident-enhanced-html"
                    dangerouslySetInnerHTML={{ __html: displayHtml ?? "" }}
                  />
                </div>
              </div>
            )}
            <Separator />
            <p className="text-sm font-medium">Q&A</p>
            {inc.questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No questions recorded.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {inc.questions.map((q) => (
                  <li key={q.id} className="rounded border border-border/40 p-2">
                    <p className="font-medium text-foreground">{q.questionText}</p>
                    {q.answer ? (
                      <p className="mt-0.5 text-muted-foreground">
                        {q.answer.answerText} — {q.answer.answeredBy}{" "}
                        {q.answer.answeredAt ? new Date(q.answer.answeredAt).toLocaleString() : ""}
                      </p>
                    ) : (
                      <p className="text-amber-700">Pending</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="idt" className="space-y-2 pt-2 text-sm">
            <Phase2IdtTab
              incident={inc}
              incidentId={incidentId}
              searchParams={searchParams}
              onRefresh={onRefresh}
            />
          </TabsContent>
          <TabsContent value="sec" className="pt-2">
            {inc.phase === "closed" ? (
              <p className="text-sm text-muted-foreground">This investigation is closed. Unlock to edit sections.</p>
            ) : (
              <ul className="space-y-2">
                {SECTIONS.map(({ key, param, label }) => {
                  const st = p2?.[key]?.status ?? "not_started"
                  return (
                    <li key={key} className="flex flex-col gap-1 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Circle
                            className={cn("h-2.5 w-2.5 fill-current", st === "complete" ? "text-teal-500" : st === "in_progress" ? "text-amber-400" : "text-muted-foreground/40")}
                          />
                          {label}
                        </div>
                        <p className="text-xs capitalize text-muted-foreground">{st.replace(/_/g, " ")}</p>
                      </div>
                      <Button asChild size="sm" variant="secondary" disabled={inc.phase !== "phase_2_in_progress"}>
                        <Link
                          href={buildAdminPathWithContext(`/admin/incidents/${incidentId}/section/${param}`, searchParams)}
                        >
                          Work in section
                        </Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="res" className="pt-2 text-sm">
            {inc.residentId ? (
              <Phase2ResidentContextTab
                residentId={inc.residentId}
                residentName={inc.residentName}
                incidentId={incidentId}
                searchParams={searchParams}
              />
            ) : (
              <p className="text-muted-foreground">No resident linked to this report.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
