"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageSquareText,
} from "lucide-react"
import { toast } from "sonner"

import type { Incident, Question } from "@/lib/types"
import { buildIncidentCombinedNarrative } from "@/lib/utils/incident-narrative"
import { renderMarkdownOrHtml } from "@/lib/utils/markdown-to-html"
import { filterIdtQuestions } from "@/lib/idt-question-helpers"
import { staffQuestionGroup, GROUP_LABEL, type StaffQuestionGroup } from "@/lib/staff-incident-question-group"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { PhaseBadge } from "@/components/shared/phase-badge"
import { CompletionRing } from "@/components/shared/completion-ring"
import { StaffIncidentIntelligenceTab } from "@/components/staff/staff-incident-intelligence-tab"
import { EmailPhase1ReportButton } from "@/components/staff/email-phase1-report-dialog"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import {
  computePhase1WorkflowPercent,
  countPhase1WorkflowFromQuestions,
} from "@/lib/report/phase1-workflow-progress"

/* ─── Design tokens ──────────────────────────────────────────────── */
const PHASE_ORDER: StaffIncidentSummary["phase"][] = [
  "phase_1_in_progress",
  "phase_1_complete",
  "phase_2_in_progress",
  "closed",
]

const HERO =
  "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-background to-accent/[0.08] shadow-md"

const CARD =
  "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04] shadow-sm"

const SECTION_KEYS: Array<{
  key: keyof NonNullable<Incident["phase2Sections"]>
  label: string
}> = [
  { key: "contributingFactors", label: "Contributing factors" },
  { key: "rootCause", label: "Root cause" },
  { key: "interventionReview", label: "Intervention review" },
  { key: "newIntervention", label: "New intervention" },
]

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatTypeLabel(inc: Incident) {
  const t = (inc.incidentType || inc.title || "Incident").replace(/_/g, " ")
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

function sectionStatusDot(status: "not_started" | "in_progress" | "complete" | undefined) {
  if (status === "complete") return "bg-[#0D7377] ring-2 ring-[#0D7377]/30"
  if (status === "in_progress") return "bg-amber-500 ring-2 ring-amber-500/30"
  return "bg-muted-foreground/30"
}

function isDeferredAnswer(a?: { answerText?: string }) {
  return a?.answerText === "__DEFERRED__"
}
function isUnknownAnswer(a?: { answerText?: string }) {
  return a?.answerText === "__UNKNOWN__"
}

/** Shown when WAiK has extracted rich detail from early answers but question steps remain. */
function phase1DocumentationGapMessage(documentationDepth: number, phase1Percent: number): string {
  return `WAiK captured ${documentationDepth}% of charting fields from your narrative. Phase 1 is ${phase1Percent}% complete — continue to finish follow-up and closing questions.`
}

/* ─── Small components ───────────────────────────────────────────── */
function AnswerText({ answer }: { answer: NonNullable<Question["answer"]> }) {
  if (isDeferredAnswer(answer))
    return (
      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <Clock className="h-3 w-3" /> Deferred
      </span>
    )
  if (isUnknownAnswer(answer))
    return (
      <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Not known at time of report
      </span>
    )
  return (
    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
      {answer.answerText}
    </p>
  )
}

function TierBar({ label, questions }: { label: string; questions: Question[] }) {
  if (!questions.length) return null
  const answered = questions.filter(
    (q) => q.answer && !isDeferredAnswer(q.answer) && !isUnknownAnswer(q.answer),
  ).length
  const pct = Math.round((answered / questions.length) * 100)
  return (
    <div className="flex items-center gap-3">
      <p className="w-20 shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
        {answered}/{questions.length}
      </p>
    </div>
  )
}

export type StaffIncidentDetailViewProps = {
  incidentId: string
  variant?: "staff" | "admin"
  /** Admin facility context, e.g. `?facilityId=…&organizationId=…` */
  apiQueryString?: string
  backHref?: string
  phase1ReportHref?: string
  closureReportHref?: string
  investigationWorkspaceHref?: string
  canManageInvestigation?: boolean
}

/* ─── Main component ─────────────────────────────────────────────── */
export function StaffIncidentDetailView({
  incidentId,
  variant = "staff",
  apiQueryString = "",
  backHref: backHrefProp,
  phase1ReportHref,
  closureReportHref,
  investigationWorkspaceHref,
  canManageInvestigation = false,
}: StaffIncidentDetailViewProps) {
  const router = useRouter()
  const isAdminView = variant === "admin"
  const backHref = backHrefProp ?? (isAdminView ? "/admin/incidents" : "/staff/incidents")
  const backLabel = backHref.includes("/staff/incidents")
    ? "Incidents"
    : isAdminView
      ? "All incidents"
      : "my incidents"
  const incidentApiSuffix = apiQueryString || ""
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [mongoUserId, setMongoUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [idtDrafts, setIdtDrafts] = useState<Record<string, string>>({})
  const [savingQid, setSavingQid] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("report")

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const r = await fetch("/api/auth/user-flags")
        if (r.ok) {
          const j = (await r.json()) as { userId?: string; email?: string }
          if (alive) {
            setMongoUserId(typeof j.userId === "string" ? j.userId : null)
            setUserEmail(typeof j.email === "string" ? j.email : "")
          }
        }
      } catch {
        if (alive) setMongoUserId(null)
      }
    })()
    return () => { alive = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    setNotFound(false)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}${incidentApiSuffix}`, {
        credentials: "include",
      })
      if (res.status === 403) { setForbidden(true); setIncident(null); return }
      if (res.status === 404) { setNotFound(true); setIncident(null); return }
      if (!res.ok) throw new Error("fetch failed")
      setIncident((await res.json()) as Incident)
    } catch {
      toast.error("Could not load this incident")
      setIncident(null)
    } finally {
      setLoading(false)
    }
  }, [incidentId, incidentApiSuffix])

  useEffect(() => { void load() }, [load])

  /* derived */
  const phase = (incident?.phase ?? "phase_1_in_progress") as StaffIncidentSummary["phase"]
  const documentationDepth = Math.round(incident?.completenessScore ?? 0)
  const isMyReport = Boolean(mongoUserId && incident?.staffId === mongoUserId)
  const isInProgress = phase === "phase_1_in_progress"

  const workflowPercent = useMemo(() => {
    if (!incident) return 0
    const nonIdt = (incident.questions ?? []).filter((q) => !q.metadata?.idt)
    return computePhase1WorkflowPercent(
      countPhase1WorkflowFromQuestions(nonIdt),
      phase,
    )
  }, [incident, phase])

  const originalWords = useMemo(() => {
    if (!incident) return "—"
    return incident.initialReport?.narrative?.trim() || incident.description?.trim() || "—"
  }, [incident])

  const clinicalRecord = useMemo(() => {
    if (!incident) return "—"
    if (incident.initialReport?.enhancedNarrative?.trim())
      return incident.initialReport.enhancedNarrative.trim()
    const h = [incident.humanReport?.summary, incident.aiReport?.summary, incident.summary].find(
      (s) => s && String(s).trim(),
    )
    return h ? String(h).trim() : "—"
  }, [incident])

  const questionsByGroup = useMemo(() => {
    if (!incident?.questions) return new Map<StaffQuestionGroup, Question[]>()
    const m = new Map<StaffQuestionGroup, Question[]>()
    for (const q of incident.questions) {
      const g = staffQuestionGroup(q)
      m.set(g, [...(m.get(g) ?? []), q])
    }
    return m
  }, [incident])

  const myIdtQuestions = useMemo(() => {
    if (!incident || !mongoUserId) return []
    return filterIdtQuestions(incident.questions).filter((q) =>
      q.assignedTo?.includes(mongoUserId),
    )
  }, [incident, mongoUserId])

  const showInvestigationStatusTab = isAdminView
    ? phase !== "phase_1_in_progress" || myIdtQuestions.length > 0
    : phase === "phase_2_in_progress" || phase === "closed" || myIdtQuestions.length > 0

  const showInvestigationWorkspaceCta =
    isAdminView &&
    canManageInvestigation &&
    Boolean(investigationWorkspaceHref) &&
    (phase === "phase_1_complete" || phase === "phase_2_in_progress" || phase === "closed")

  useEffect(() => {
    if (!showInvestigationStatusTab && activeTab === "status") {
      setActiveTab("report")
    }
  }, [activeTab, showInvestigationStatusTab])

  const tier1Qs = questionsByGroup.get("tier1") ?? []
  const tier2Qs = questionsByGroup.get("tier2") ?? []
  const closingQs = questionsByGroup.get("closing") ?? []
  const allNonIdt = (incident?.questions ?? []).filter((q) => !q.metadata?.idt)
  const totalAnswered = allNonIdt.filter(
    (q) => q.answer && !isDeferredAnswer(q.answer) && !isUnknownAnswer(q.answer),
  ).length
  const p2 = incident?.phase2Sections

  const hasDocumentationDepthGap =
    isInProgress && documentationDepth > workflowPercent + 15 && documentationDepth > 0

  const documentationGapMessage = useMemo(
    () =>
      hasDocumentationDepthGap
        ? phase1DocumentationGapMessage(documentationDepth, workflowPercent)
        : null,
    [documentationDepth, hasDocumentationDepthGap, workflowPercent],
  )

  async function submitIdtResponse(questionId: string) {
    const text = (idtDrafts[questionId] ?? "").trim()
    if (!text || !mongoUserId) { toast.error("Enter a response first."); return }
    setSavingQid(questionId)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId, answerText: text, answeredBy: mongoUserId, method: "text" }),
      })
      if (res.status === 403) { toast.error("You can't submit for another user."); return }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(typeof j.error === "string" ? j.error : "Save failed")
        return
      }
      toast.success("Response submitted")
      setIdtDrafts((d) => ({ ...d, [questionId]: "" }))
      await load()
    } finally {
      setSavingQid(null)
    }
  }

  /* ── Loading / error states ────────────────────────────────────── */
  if (loading && !incident) {
    return (
      <div className="relative w-full min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 lg:px-6">
          <Skeleton className="h-10 w-48 rounded-2xl" />
          <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 xl:grid-cols-[1fr_360px]">
            <Skeleton className="h-64 rounded-2xl" />
            <div className="hidden space-y-4 lg:block">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="relative w-full min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
          <p className="text-base font-semibold text-foreground">You can't open this report</p>
          <p className="text-sm text-muted-foreground">
            {isAdminView
              ? "This incident is outside your facility scope or your role cannot open it."
              : "You can open reports you filed or investigations where you have an assigned task."}
          </p>
          <Button asChild className="min-h-12 rounded-xl">
            <Link href={backHref}>Back to {backLabel}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (notFound || !incident) {
    return (
      <div className="relative w-full min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
          <p className="text-base font-semibold">Incident not found</p>
          <Button asChild variant="outline" className="min-h-12 rounded-xl">
            <Link href={backHref}>Back to {backLabel}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasClinicalHtml = /<\/?[a-z][\s\S]*>/i.test(clinicalRecord)
  const clinicalBlock = hasClinicalHtml ? (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: renderMarkdownOrHtml(clinicalRecord) || clinicalRecord }}
    />
  ) : (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{clinicalRecord}</p>
  )

  /* ── Page ─────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full min-h-0 flex-1">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      {/* ── Sticky nav ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 min-w-10 shrink-0 rounded-xl p-0"
            onClick={() => router.push(backHref)}
            aria-label={`Back to ${backLabel}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {formatTypeLabel(incident)}{" "}
              <span className="font-normal text-muted-foreground">—</span>{" "}
              {incident.residentName || `Room ${incident.residentRoom}`}
            </p>
            <p className="text-[0.7rem] text-muted-foreground">
              Room {incident.residentRoom} · Reported by {incident.staffName}
            </p>
          </div>
          <PhaseBadge
            phase={PHASE_ORDER.includes(phase) ? phase : "phase_1_in_progress"}
            size="sm"
          />
        </div>
      </div>

      {/* ── Two-column body ────────────────────────────────────── */}
      <div className="mx-auto min-h-0 max-w-[1600px] px-4 py-5 pb-10 sm:px-6 lg:py-6">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6 xl:grid-cols-[1fr_360px]">

          {/* ─── LEFT — main content ─────────────────────────── */}
          <div className="min-w-0 space-y-5">

            {/* Score / sync notice (mobile only — shown above tabs) */}
            {documentationGapMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3.5 text-sm dark:border-amber-800/50 dark:bg-amber-950/30 lg:hidden">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="min-w-0 text-amber-800/80 dark:text-amber-300/80">
                  {documentationGapMessage}
                </p>
              </div>
            ) : null}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
              <TabsList
                className={cn(
                  "grid w-full gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5",
                  showInvestigationStatusTab ? "grid-cols-4" : "grid-cols-3",
                )}
              >
                <TabsTrigger
                  value="report"
                  className="rounded-xl text-sm data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
                >
                  {isAdminView ? "Report record" : "My report"}
                </TabsTrigger>
                <TabsTrigger
                  value="questions"
                  className="rounded-xl text-sm data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
                >
                  Questions
                </TabsTrigger>
                <TabsTrigger
                  value="intelligence"
                  className="rounded-xl text-sm data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
                >
                  <Brain className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                  Intelligence
                </TabsTrigger>
                {showInvestigationStatusTab ? (
                  <TabsTrigger
                    value="status"
                    className="rounded-xl text-sm data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
                  >
                    Investigation
                  </TabsTrigger>
                ) : null}
              </TabsList>

              {/* ── Questions tab ─────────────────────────────── */}
              <TabsContent value="questions" className="mt-5 min-h-0 space-y-5">

                {/* Progress card */}
                {allNonIdt.length > 0 ? (
                  <div className={cn(CARD, "space-y-3 p-4 sm:p-5")}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Question progress</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {totalAnswered} of {allNonIdt.length} answered
                      </p>
                    </div>
                    <TierBar label="Initial" questions={tier1Qs} />
                    <TierBar label="Follow-up" questions={tier2Qs} />
                    <TierBar label="Closing" questions={closingQs} />
                  </div>
                ) : null}

                {/* Sync notice inside tab (desktop) */}
                {documentationGapMessage ? (
                  <div className="hidden items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3.5 text-sm dark:border-amber-800/50 dark:bg-amber-950/30 lg:flex">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="min-w-0 text-amber-800/80 dark:text-amber-300/80">
                      {documentationGapMessage}{" "}
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2 hover:no-underline"
                        onClick={() =>
                          router.push(
                            `/staff/report?incidentId=${encodeURIComponent(incidentId)}`,
                          )
                        }
                      >
                        Continue &amp; submit
                      </button>
                    </p>
                  </div>
                ) : null}

                {/* Question groups */}
                {(["tier1", "tier2", "closing"] as const).map((g) => {
                  const list = questionsByGroup.get(g) ?? []
                  if (!list.length) return null
                  return (
                    <div key={g} className="space-y-2.5">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {GROUP_LABEL[g]}
                      </p>
                      <ul className="space-y-2 sm:grid sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 xl:gap-x-4 xl:gap-y-2 xl:space-y-0">
                        {list.map((q) => {
                          const hasAnswer = Boolean(q.answer)
                          const isDeferred = isDeferredAnswer(q.answer)
                          const unanswered = !hasAnswer && isInProgress && !q.metadata?.idt
                          return (
                            <li
                              key={q.id}
                              className={cn(
                                "rounded-2xl border border-l-[3px] p-3.5 shadow-sm transition-colors sm:p-4",
                                hasAnswer && !isDeferred
                                  ? "border-emerald-500/25 border-l-emerald-500/70 bg-gradient-to-br from-emerald-500/[0.05] via-background to-emerald-500/[0.02]"
                                  : isDeferred
                                    ? "border-amber-400/30 border-l-amber-500/60 bg-gradient-to-br from-amber-400/[0.06] via-background to-amber-400/[0.02]"
                                    : "border-border/50 border-l-muted-foreground/25 bg-card/70",
                              )}
                            >
                              <div className="flex min-w-0 items-start gap-2.5">
                                <div className="mt-0.5 shrink-0">
                                  {hasAnswer && !isDeferred ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  ) : isDeferred ? (
                                    <Clock className="h-4 w-4 text-amber-600" />
                                  ) : (
                                    <MessageSquareText className="h-4 w-4 text-muted-foreground/40" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-snug text-foreground">
                                    {q.questionText}
                                  </p>
                                  {q.answer ? (
                                    <AnswerText answer={q.answer} />
                                  ) : (
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                      Not answered yet
                                    </p>
                                  )}
                                  {q.askedAt ? (
                                    <p className="mt-2 text-[0.65rem] text-muted-foreground/60">
                                      {format(new Date(q.askedAt), "MMM d, h:mm a")}
                                    </p>
                                  ) : null}
                                  {unanswered ? (
                                    <Button
                                      className="mt-3 min-h-9 w-full rounded-xl text-sm shadow-sm shadow-primary/15"
                                      onClick={() =>
                                        router.push(
                                          `/staff/report?incidentId=${encodeURIComponent(incidentId)}`,
                                        )
                                      }
                                    >
                                      Answer now
                                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                  ) : null}
                                  {isDeferred && isInProgress && !q.metadata?.idt ? (
                                    <Button
                                      variant="outline"
                                      className="mt-3 min-h-9 w-full rounded-xl border-amber-400/50 text-sm text-amber-950 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                                      onClick={() =>
                                        router.push(
                                          `/staff/report?incidentId=${encodeURIComponent(incidentId)}`,
                                        )
                                      }
                                    >
                                      Resume deferred question
                                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}

                {/* IDT */}
                {(questionsByGroup.get("idt") ?? []).length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {GROUP_LABEL.idt}
                    </p>
                    <ul className="space-y-2">
                      {(questionsByGroup.get("idt") ?? []).map((q) => (
                        <li key={q.id} className={cn(CARD, "p-4 text-sm")}>
                          <p className="font-medium text-foreground">{q.questionText}</p>
                          {q.answer ? (
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {q.answer.answerText}
                            </p>
                          ) : (
                            <p className="mt-1 text-muted-foreground">
                              Awaiting your response in the Status tab.
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Empty state */}
                {!incident.questions?.length ? (
                  <div className={cn(CARD, "p-8 text-center sm:p-10")}>
                    <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="font-semibold text-foreground">No questions on file yet</p>
                    <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
                      Questions are recorded as you answer them during the voice report flow.
                    </p>
                    {isInProgress && isMyReport ? (
                      <Button
                        className="mt-5 min-h-11 rounded-xl px-6"
                        onClick={() =>
                          router.push(
                            `/staff/report?incidentId=${encodeURIComponent(incidentId)}`,
                          )
                        }
                      >
                        Open report flow
                        <ChevronRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>

              {/* ── My report tab ──────────────────────────────── */}
              <TabsContent value="report" className="mt-5 min-h-0 space-y-5">
                <div className={cn(CARD, "divide-y divide-border/40 overflow-hidden p-0")}>
                  <div className="p-4 sm:p-5">
                    <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {isAdminView ? "Staff original words" : "Your original words"}
                    </p>
                    <blockquote className="border-l-[3px] border-primary/30 bg-primary/[0.03] p-3 text-sm italic leading-relaxed text-foreground">
                      {originalWords}
                    </blockquote>
                  </div>

                  {clinicalRecord !== "—" ? (
                    <div className="p-4 sm:p-5">
                      <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Official clinical record
                      </p>
                      <div className="rounded-xl border border-border/40 bg-background/70 p-3">
                        {clinicalBlock}
                      </div>
                    </div>
                  ) : null}

                  {buildIncidentCombinedNarrative(incident) ? (
                    <div className="p-4 sm:p-5">
                      <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Combined narrative
                      </p>
                      <p className="mb-2 text-[0.65rem] text-muted-foreground/70">
                        Full narrative with structured answers included
                      </p>
                      <div className="rounded-xl border border-border/40 bg-background/70 p-3 text-sm whitespace-pre-wrap text-foreground">
                        {buildIncidentCombinedNarrative(incident)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {allNonIdt.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      All answers
                    </p>
                    <ul className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 lg:grid-cols-1 xl:grid-cols-2">
                      {allNonIdt.map((q) => (
                        <li
                          key={q.id}
                          className={cn(
                            "rounded-xl border px-3.5 py-3",
                            q.answer && !isDeferredAnswer(q.answer)
                              ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                              : "border-border/40 bg-card/60",
                          )}
                        >
                          <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                          {q.answer ? (
                            <AnswerText answer={q.answer} />
                          ) : (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              Not answered yet
                            </p>
                          )}
                          {q.answer?.answeredAt ? (
                            <p className="mt-1.5 text-[0.65rem] text-muted-foreground/60">
                              {format(new Date(q.answer.answeredAt), "MMM d, h:mm a")}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {phase !== "phase_1_in_progress" ? (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {isAdminView ? (
                      <>
                        {phase1ReportHref ? (
                          <Link
                            href={phase1ReportHref}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary/40"
                          >
                            <FileText className="h-4 w-4" />
                            View signed Phase 1 report
                          </Link>
                        ) : null}
                        <a
                          href={`/api/incidents/${encodeURIComponent(incidentId)}/report/pdf${incidentApiSuffix}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary/30"
                        >
                          <Download className="h-4 w-4" />
                          Download Phase 1 PDF
                        </a>
                        {phase === "closed" && closureReportHref ? (
                          <Link
                            href={closureReportHref}
                            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary/30"
                          >
                            <FileText className="h-4 w-4" />
                            Closure report (print / PDF)
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {incident.initialReport?.signature?.reportPdfUrl ? (
                          <a
                            href={incident.initialReport.signature.reportPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary/40"
                          >
                            <Download className="h-4 w-4" />
                            Download Phase 1 Report (PDF)
                          </a>
                        ) : null}
                        <Link
                          href={`/staff/incidents/${incidentId}/report`}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary/30"
                        >
                          <FileText className="h-4 w-4" />
                          View / Print Report
                        </Link>
                      </>
                    )}
                    <EmailPhase1ReportButton incidentId={incidentId} defaultEmail={userEmail} />
                    <p className="w-full text-xs text-muted-foreground">
                      {isAdminView
                        ? "Signed Phase 1 record with nurse signature and WAiK summary"
                        : "Includes WAiK summary and your signature"}
                    </p>
                  </div>
                ) : null}

                {incident.initialReport?.signature?.signatureImage ? (
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Signed by {incident.initialReport.signature.signedByName}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={incident.initialReport.signature.signatureImage}
                      alt="Signature"
                      className="h-12 opacity-80"
                    />
                    {incident.initialReport.signature.signedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(incident.initialReport.signature.signedAt), "MMM d, yyyy h:mm a")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="intelligence" className="mt-5 min-h-0">
                <StaffIncidentIntelligenceTab
                  incidentId={incidentId}
                  incidentType={incident.incidentType ?? incident.title ?? "incident"}
                  phase={phase}
                />
              </TabsContent>

              {/* ── Status tab ─────────────────────────────────── */}
              <TabsContent value="status" className="mt-5 min-h-0 space-y-5">

                {showInvestigationWorkspaceCta && investigationWorkspaceHref ? (
                  <div className={cn(CARD, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5")}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Phase 2 investigation workspace</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {phase === "phase_1_complete" && !incident.investigatorId
                          ? "Claim this investigation, manage IDT questions, and complete investigation sections."
                          : phase === "closed"
                            ? "Review the full investigation record, audit trail, and sign-off history."
                            : "Manage IDT roster, investigation sections, and sign-off."}
                      </p>
                    </div>
                    <Button asChild className="min-h-11 shrink-0 rounded-xl">
                      <Link href={investigationWorkspaceHref}>
                        {phase === "phase_1_complete" && !incident.investigatorId
                          ? "Claim & open workspace"
                          : "Open investigation workspace"}
                        <ChevronRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}

                {/* Phase card (mobile duplicate of sidebar) */}
                <div className={cn(HERO, "p-5 text-center lg:hidden")}>
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
                    aria-hidden
                  />
                  <div className="relative">
                    <PhaseBadge phase={phase} size="md" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {phaseStatusLine(phase)}
                    </p>
                    {workflowPercent > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Phase 1 progress:{" "}
                        <span className="font-semibold text-foreground">{workflowPercent}%</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Phase 2 investigation sections */}
                {(phase === "phase_2_in_progress" || phase === "closed") ? (
                  <div className={cn(CARD, "p-4 sm:p-5")}>
                    <p className="mb-3 text-xs font-semibold text-foreground">
                      Investigation sections
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {SECTION_KEYS.map(({ key, label }) => {
                        const st = p2?.[key]?.status
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span
                              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", sectionStatusDot(st))}
                              title={st ?? "not_started"}
                            />
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* IDT questions from Director of Nursing */}
                {myIdtQuestions.length > 0 && mongoUserId ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Questions from the Director of Nursing
                    </p>
                    {myIdtQuestions.map((q) =>
                      q.answer ? (
                        <div key={q.id} className={cn(CARD, "border-primary/20 bg-primary/[0.04] p-4")}>
                          <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                          <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                            {q.answer.answerText}
                          </blockquote>
                          <p className="mt-1.5 text-[0.65rem] text-muted-foreground/60">
                            Answered{" "}
                            {q.answer.answeredAt
                              ? format(new Date(q.answer.answeredAt), "MMM d, yyyy h:mm a")
                              : "—"}
                          </p>
                        </div>
                      ) : (
                        <div key={q.id} className={cn(CARD, "p-4")}>
                          <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                          <Textarea
                            className="mt-3 min-h-24 rounded-xl"
                            placeholder="Type your response…"
                            value={idtDrafts[q.id] ?? ""}
                            onChange={(e) =>
                              setIdtDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                            }
                          />
                          <Button
                            className="mt-3 min-h-11 w-full rounded-xl"
                            onClick={() => void submitIdtResponse(q.id)}
                            disabled={savingQid === q.id}
                          >
                            {savingQid === q.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting…
                              </>
                            ) : (
                              "Submit response"
                            )}
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                ) : null}

                {/* Closed outcome */}
                {phase === "closed" ? (
                  <div className="rounded-2xl border border-[#0D7377]/30 bg-[#EEF8F8]/80 p-5 text-sm dark:bg-[#0D7377]/10">
                    <p className="font-semibold text-[#0D7377]">Investigation complete</p>
                    {incident.phaseTransitionTimestamps?.phase2Locked ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Closed{" "}
                        {format(
                          new Date(incident.phaseTransitionTimestamps.phase2Locked),
                          "MMM d, yyyy",
                        )}
                      </p>
                    ) : null}
                    <p className="mt-2 text-foreground/90">This report is closed and archived.</p>
                    {p2?.rootCause?.description ? (
                      <div className="mt-4 space-y-1">
                        <p className="font-medium text-foreground">Root cause</p>
                        <p className="whitespace-pre-wrap text-foreground/90">
                          {p2.rootCause.description}
                        </p>
                        {p2.newIntervention?.interventions &&
                          p2.newIntervention.interventions.length > 0 ? (
                          <div className="mt-3">
                            <p className="font-medium text-foreground">New interventions</p>
                            <ul className="mt-1 list-inside list-disc text-foreground/90">
                              {p2.newIntervention.interventions.map((n, i) => (
                                <li key={i} className="whitespace-pre-wrap">
                                  {n.description ?? "—"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>

          {/* ─── RIGHT — sidebar (lg+) ──────────────────────────── */}
          <div className="mt-5 hidden space-y-4 lg:mt-0 lg:block">

            {/* Incident hero card */}
            <div className={cn(HERO, "p-5")}>
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-4 left-1/3 h-20 w-36 rounded-full bg-accent/10 blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Incident report
                </p>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                      {formatTypeLabel(incident)}
                    </h1>
                    <p className="mt-0.5 text-sm font-medium text-foreground/80">
                      {incident.residentName || "Resident"}
                    </p>
                    <p className="text-sm text-muted-foreground">Room {incident.residentRoom}</p>
                  </div>
                  <CompletionRing percent={workflowPercent} size={56} strokeWidth={3.5} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {format(new Date(incident.createdAt), "MMM d, yyyy · h:mm a")}
                  </span>
                  {incident.location ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {incident.location}
                    </span>
                  ) : null}
                  {incident.phaseTransitionTimestamps?.phase1Signed ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[0.7rem] font-medium text-primary/80">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      Signed{" "}
                      {format(
                        new Date(incident.phaseTransitionTimestamps.phase1Signed),
                        "MMM d",
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Phase status */}
            <div className={cn(CARD, "p-4")}>
              <div className="flex items-center gap-3">
                <PhaseBadge
                  phase={PHASE_ORDER.includes(phase) ? phase : "phase_1_in_progress"}
                  size="sm"
                />
                <p className="text-xs text-muted-foreground">{phaseStatusLine(phase)}</p>
              </div>
              {workflowPercent > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-500"
                      style={{ width: `${workflowPercent}%` }}
                    />
                  </div>
                  <p className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-foreground">
                    {workflowPercent}%
                  </p>
                </div>
              )}
            </div>

            {/* Sync notice (sidebar) */}
            {documentationGapMessage ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3.5 text-xs dark:border-amber-800/50 dark:bg-amber-950/30">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-800 dark:text-amber-300">{documentationGapMessage}</p>
              </div>
            ) : null}

            {/* Continue & submit CTA */}
            {isInProgress && isMyReport ? (
              <Button
                className="w-full min-h-12 rounded-xl shadow-md shadow-primary/20 text-base"
                onClick={() =>
                  router.push(`/staff/report?incidentId=${encodeURIComponent(incidentId)}`)
                }
              >
                Continue &amp; submit
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : null}

            {/* Intelligence link */}
            <button
              type="button"
              className={cn(
                CARD,
                "flex w-full items-center gap-3 p-3.5 text-left transition hover:border-primary/40 hover:shadow-md active:scale-[0.99]",
              )}
              onClick={() => setActiveTab("intelligence")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Incident Intelligence
                </span>
                <span className="block text-[0.7rem] text-muted-foreground">
                  Ask about this incident&apos;s answers
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function phaseStatusLine(phase: StaffIncidentSummary["phase"]) {
  switch (phase) {
    case "phase_1_in_progress": return "Report in progress"
    case "phase_1_complete": return "Submitted — investigation pending"
    case "phase_2_in_progress": return "Investigation underway"
    case "closed": return "Closed and archived"
    default: return ""
  }
}
