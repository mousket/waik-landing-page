"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Loader2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PhaseBadge } from "@/components/shared/phase-badge"
import { CompletionRing } from "@/components/shared/completion-ring"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

const PHASE_ORDER: StaffIncidentSummary["phase"][] = [
  "phase_1_in_progress",
  "phase_1_complete",
  "phase_2_in_progress",
  "closed",
]

function formatTypeLabel(inc: Incident) {
  const t = (inc.incidentType || inc.title || "Incident").replace(/_/g, " ")
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

function sectionStatusDot(status: "not_started" | "in_progress" | "complete" | undefined) {
  if (status === "complete") return "bg-[#0D7377] ring-2 ring-[#0D7377]/30"
  if (status === "in_progress") return "bg-amber-500 ring-2 ring-amber-500/30"
  return "bg-muted-foreground/30"
}

const SECTION_KEYS: Array<{
  key: keyof NonNullable<Incident["phase2Sections"]>
  label: string
}> = [
  { key: "contributingFactors", label: "Contributing factors" },
  { key: "rootCause", label: "Root cause" },
  { key: "interventionReview", label: "Intervention review" },
  { key: "newIntervention", label: "New intervention" },
]

function isDeferredAnswer(a?: { answerText?: string }) {
  return a?.answerText === "__DEFERRED__"
}

export function StaffIncidentDetailView({ incidentId }: { incidentId: string }) {
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [mongoUserId, setMongoUserId] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [idtDrafts, setIdtDrafts] = useState<Record<string, string>>({})
  const [savingQid, setSavingQid] = useState<string | null>(null)

  useEffect(() => {
    let a = true
    ;(async () => {
      try {
        const r = await fetch("/api/auth/user-flags", { method: "GET" })
        if (r.ok) {
          const j = (await r.json()) as { userId?: string }
          if (a) setMongoUserId(typeof j.userId === "string" ? j.userId : null)
        }
      } catch {
        if (a) setMongoUserId(null)
      }
    })()
    return () => {
      a = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    setNotFound(false)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, { credentials: "include" })
      if (res.status === 403) {
        setForbidden(true)
        setIncident(null)
        return
      }
      if (res.status === 404) {
        setNotFound(true)
        setIncident(null)
        return
      }
      if (!res.ok) throw new Error("fetch failed")
      const data = (await res.json()) as Incident
      setIncident(data)
    } catch {
      toast.error("Could not load this incident")
      setIncident(null)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    void load()
  }, [load])

  const phase = (incident?.phase ?? "phase_1_in_progress") as StaffIncidentSummary["phase"]
  const score = Math.round(incident?.completenessScore ?? 0)

  const originalWords = useMemo(() => {
    if (!incident) return "—"
    return (
      incident.initialReport?.narrative?.trim() ||
      incident.description?.trim() ||
      "—"
    )
  }, [incident])

  const clinicalRecord = useMemo(() => {
    if (!incident) return "—"
    if (incident.initialReport?.enhancedNarrative?.trim()) return incident.initialReport.enhancedNarrative.trim()
    const h = [incident.humanReport?.summary, incident.aiReport?.summary, incident.summary].find((s) => s && String(s).trim())
    return h ? String(h).trim() : "—"
  }, [incident])

  const questionsByGroup = useMemo(() => {
    if (!incident?.questions) return new Map<StaffQuestionGroup, Question[]>()
    const m = new Map<StaffQuestionGroup, Question[]>()
    for (const q of incident.questions) {
      const g = staffQuestionGroup(q)
      const list = m.get(g) ?? []
      list.push(q)
      m.set(g, list)
    }
    return m
  }, [incident])

  const myIdtQuestions = useMemo(() => {
    if (!incident || !mongoUserId) return []
    return filterIdtQuestions(incident.questions).filter((q) => q.assignedTo?.includes(mongoUserId))
  }, [incident, mongoUserId])

  const p2 = incident?.phase2Sections

  async function submitIdtResponse(questionId: string) {
    const text = (idtDrafts[questionId] ?? "").trim()
    if (!text || !mongoUserId) {
      toast.error("Enter a response first.")
      return
    }
    setSavingQid(questionId)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          answerText: text,
          answeredBy: mongoUserId,
          method: "text",
        }),
      })
      if (res.status === 403) {
        toast.error("You can’t submit for another user.")
        return
      }
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

  const statusLine = useMemo(() => {
    switch (phase) {
      case "phase_1_in_progress":
        return "Your report is in progress."
      case "phase_1_complete":
        return "Your report has been submitted. The Director of Nursing will begin the investigation."
      case "phase_2_in_progress":
        return "Investigation is underway."
      case "closed":
        return "Investigation complete. This case is closed."
      default:
        return ""
    }
  }, [phase])

  if (loading && !incident) {
    return (
      <div className="mx-auto min-h-0 w-full max-w-lg min-w-0 space-y-4 px-4 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg min-w-0 space-y-4 px-4 py-8 text-center">
        <p className="text-base font-medium text-foreground">You can’t open this report</p>
        <p className="text-sm text-muted-foreground">Incidents you didn’t file are only visible to the care leadership team.</p>
        <Button asChild className="min-h-12">
          <Link href="/staff/incidents">Back to my incidents</Link>
        </Button>
      </div>
    )
  }

  if (notFound || !incident) {
    return (
      <div className="mx-auto max-w-lg min-w-0 space-y-4 px-4 py-8 text-center">
        <p className="text-base font-medium">Incident not found</p>
        <Button asChild variant="outline" className="min-h-12">
          <Link href="/staff/incidents">Back to my incidents</Link>
        </Button>
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

  return (
    <div className="mx-auto min-h-0 w-full min-w-0 max-w-lg pb-10">
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 min-w-12 shrink-0 p-0"
            onClick={() => router.push("/staff/incidents")}
            aria-label="Back to my incidents"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight text-foreground">
              {formatTypeLabel(incident)} — Room {incident.residentRoom}
            </h1>
            <p className="text-xs text-muted-foreground">Reported as {incident.staffName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PhaseBadge phase={PHASE_ORDER.includes(phase) ? phase : "phase_1_in_progress"} size="sm" />
            <div className="shrink-0">
              <CompletionRing percent={score} size={40} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg min-w-0 space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/20 to-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Started</p>
          <p className="font-medium">{format(new Date(incident.createdAt), "MMM d, yyyy · h:mm a")}</p>
          {incident.location ? <p className="mt-1 text-sm">Location: {incident.location}</p> : null}
          {incident.phaseTransitionTimestamps?.phase1Signed ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Phase 1 signed {format(new Date(incident.phaseTransitionTimestamps.phase1Signed), "MMM d, yyyy")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-2 pt-4 sm:px-4">
        <Tabs defaultValue="report" className="w-full min-w-0">
          <TabsList
            className="grid w-full min-h-0 max-w-lg grid-cols-3 gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5"
            aria-label="Incident sections"
          >
            <TabsTrigger
              value="report"
              className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
            >
              My report
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
            >
              Questions
            </TabsTrigger>
            <TabsTrigger
              value="investigation"
              className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
            >
              Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="mt-4 min-h-0 min-w-0 space-y-4 px-2 data-[state=active]:pt-0 sm:px-0">
            <p className="text-xs text-muted-foreground">Preserved exactly as spoken or typed, next to the official record.</p>

            <div className="hidden md:block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mb-2 rounded-xl"
                onClick={() => setCompareOpen((o) => !o)}
              >
                {compareOpen ? "Stacked view" : "Compare side by side"}
              </Button>
            </div>

            <div className={cn("gap-3", compareOpen ? "grid md:grid-cols-2" : "flex flex-col space-y-4")}>
              <section>
                <p className="text-sm font-semibold text-foreground">Your original words</p>
                <blockquote className="mt-2 border-l-4 border-foreground/30 bg-muted/40 p-3 text-sm italic text-foreground">
                  {originalWords}
                </blockquote>
              </section>
              <section>
                <p className="text-sm font-semibold text-foreground">Official clinical record</p>
                <div className="mt-2 rounded-xl border border-border/50 bg-card p-3">{clinicalBlock}</div>
              </section>
            </div>
            <section>
              <p className="text-sm font-semibold text-foreground">Narrative including answers</p>
              <p className="text-xs text-muted-foreground">Combined for documentation review</p>
              <div className="mt-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                {buildIncidentCombinedNarrative(incident) || "—"}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">All your answers</h3>
              <ul className="mt-2 space-y-3">
                {(incident.questions ?? [])
                  .filter((q) => !q.metadata?.idt)
                  .map((q) => (
                    <li key={q.id} className="rounded-xl border border-border/40 p-3">
                      <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                      {q.answer ? (
                        isDeferredAnswer(q.answer) ? (
                          <Badge className="mt-1" variant="secondary">
                            Deferred
                          </Badge>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{q.answer.answerText}</p>
                        )
                      ) : (
                        <p className="mt-1 text-sm text-amber-700">Not answered yet</p>
                      )}
                      {q.answer?.answeredAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(q.answer.answeredAt), "MMM d, h:mm a")}
                        </p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 min-h-0 min-w-0 space-y-6 px-2 sm:px-0">
            {(["tier1", "tier2", "closing"] as const).map((g) => {
              const list = questionsByGroup.get(g) ?? []
              if (list.length === 0) return null
              return (
                <div key={g}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {GROUP_LABEL[g]}
                  </p>
                  <ul className="space-y-3">
                    {list.map((q) => {
                      const unanswered = !q.answer && phase === "phase_1_in_progress" && !q.metadata?.idt
                      return (
                        <li key={q.id} className="rounded-2xl border border-border/50 bg-card/80 p-3 shadow-sm">
                          <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                          {q.answer ? (
                            isDeferredAnswer(q.answer) ? (
                              <Badge className="mt-1 bg-amber-100 text-amber-900" variant="secondary">
                                Deferred
                              </Badge>
                            ) : (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{q.answer.answerText}</p>
                            )
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Unanswered</p>
                          )}
                          {q.askedAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(new Date(q.askedAt), "MMM d, h:mm a")}
                            </p>
                          ) : null}
                          {unanswered ? (
                            <Button
                              className="mt-3 min-h-12 w-full"
                              onClick={() => router.push("/staff/report")}
                            >
                              Answer now
                            </Button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
            {(questionsByGroup.get("idt") ?? []).length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {GROUP_LABEL.idt}
                </p>
                <ul className="space-y-3">
                  {(questionsByGroup.get("idt") ?? []).map((q) => (
                    <li key={q.id} className="rounded-2xl border border-border/50 bg-card/80 p-3 text-sm">
                      <p className="font-medium">{q.questionText}</p>
                      {q.answer ? (
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{q.answer.answerText}</p>
                      ) : (
                        <p className="text-muted-foreground">Awaiting your response in the Status tab.</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!incident.questions?.length ? <p className="text-sm text-muted-foreground">No questions on file.</p> : null}
          </TabsContent>

          <TabsContent value="investigation" className="mt-4 min-h-0 min-w-0 space-y-4 px-2 sm:px-0">
            <div className="space-y-2 text-center">
              <PhaseBadge phase={phase} size="md" />
              <p className="text-sm text-muted-foreground">{statusLine}</p>
            </div>

            {phase === "phase_2_in_progress" || phase === "closed" ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Investigation sections</p>
                <div className="grid grid-cols-4 gap-1">
                  {SECTION_KEYS.map(({ key, label }) => {
                    const st = p2?.[key]?.status
                    return (
                      <div key={key} className="flex min-w-0 flex-col items-center text-center">
                        <span
                          className={cn("h-3 w-3 rounded-full", sectionStatusDot(st))}
                          title={st ?? "not_started"}
                          aria-label={label}
                        />
                        <span className="mt-1 line-clamp-2 w-full text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {myIdtQuestions.length > 0 && mongoUserId ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Questions from the Director of Nursing</p>
                {myIdtQuestions.map((q) => {
                  if (q.answer) {
                    return (
                      <div key={q.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm font-medium">{q.questionText}</p>
                        <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-primary/40 pl-2 text-sm">
                          {q.answer.answerText}
                        </blockquote>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Answered {q.answer.answeredAt ? format(new Date(q.answer.answeredAt), "MMM d, yyyy h:mm a") : "—"}
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div key={q.id} className="rounded-2xl border border-border/50 p-3">
                      <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                      <Textarea
                        className="mt-2 min-h-24"
                        placeholder="Type your response…"
                        value={idtDrafts[q.id] ?? ""}
                        onChange={(e) => setIdtDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                      />
                      <Button
                        className="mt-2 min-h-12 w-full"
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
                  )
                })}
              </div>
            ) : null}

            {phase === "closed" && p2?.rootCause?.description ? (
              <div className="rounded-2xl border border-[#0D7377]/30 bg-[#EEF8F8] p-4 text-sm">
                <p className="font-semibold text-[#0D7377]">Investigation outcome</p>
                <p className="mt-1 font-medium text-foreground">Root cause</p>
                <p className="whitespace-pre-wrap text-foreground/90">{p2.rootCause.description}</p>
                {p2.newIntervention?.interventions && p2.newIntervention.interventions.length > 0 ? (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
