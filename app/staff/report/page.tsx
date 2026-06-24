"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { readAdminScopeFromSession } from "@/lib/admin-session-scope"
import { computeWorkflowFromAnswerMap } from "@/lib/report/phase1-workflow-progress"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Bandage, Footprints, FileText, Loader2, Pill, Zap, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { QuestionBoard, type BoardQuestion } from "@/components/staff/question-board"
import VoiceInputScreen, { type VoiceInputScreenProps } from "@/components/voice-input-screen"
import { WaikLogo } from "@/components/waik-logo"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { useWaikUser } from "@/hooks/use-waik-user"
import { StaffResidentSearch, type StaffResidentSearchOption } from "@/components/staff/resident-search"
import { StaffFlowFrame } from "@/components/staff/staff-flow-backdrop"
import { ReportStepHeader } from "@/components/staff/report-step-header"
import { ReportCompletionFeedback } from "@/components/staff/report-completion-feedback"
import {
  ClinicalReportPreview,
  type PreviewResponse,
} from "@/components/staff/clinical-report-preview"
import type { ClinicalRecord } from "@/lib/agents/clinical-record-generator"
import { cn } from "@/lib/utils"

const FLOW_CARD =
  "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04] shadow-md"

function formatIncidentTypeLabel(typeKey: string | null | undefined): string {
  if (!typeKey?.trim()) return "Incident"
  return typeKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildReportContextLine(
  residentName: string | null,
  residentRoom: string | null,
  incidentType: string | null,
): string | undefined {
  const name = (residentName ?? "").trim()
  const room = (residentRoom ?? "").trim()
  const resident = name || (room ? `Room ${room}` : "")
  const type = formatIncidentTypeLabel(incidentType)
  if (resident && type) return `${resident} · ${type}`
  return resident || type || undefined
}

/** Backend Tier 1 packs exist only for these keys today (`lib/config/tier1-questions`). */
const REPORT_START_SUPPORTED_TYPES = new Set(["fall"])

export type ReportPhase =
  | "type_select"
  | "resident_splash"
  | "tier1_board"
  | "answering"
  | "gap_analysis"
  | "tier2_board"
  | "closing"
  | "preview_loading"
  | "clinical_preview"
  | "preview_error"
  | "reportcard"

export type ActiveQuestion = {
  id: string
  text: string
  label: string
  areaHint?: string
  tier: "tier1" | "tier2" | "closing"
  allowDefer: boolean
}

function toActiveQuestion(q: BoardQuestion): ActiveQuestion {
  return {
    id: q.id,
    text: q.text,
    label: q.label,
    areaHint: q.areaHint,
    tier: q.tier as ActiveQuestion["tier"],
    allowDefer: q.allowDefer,
  }
}

type ReportCardPayload = {
  completenessScore: number
  facilityAverage: number
  personalAverage: number
  currentStreak: number
  bestStreak: number
  coachingTips: string[]
  totalQuestionsAsked: number
  totalActiveSeconds: number
  dataPointsCaptured: number
  pdfStatus?: string
}

const INCIDENT_TYPE_PRESETS: Array<{
  key: string
  title: string
  description: string
  Icon: LucideIcon
}> = [
  {
    key: "fall",
    title: "Fall Incident",
    description: "Resident fall — any location",
    Icon: Footprints,
  },
  {
    key: "medication",
    title: "Medication Error",
    description: "Wrong drug, dose, or missed medication",
    Icon: Pill,
  },
  {
    key: "conflict",
    title: "Resident Conflict",
    description: "Physical or verbal incident between residents",
    Icon: Zap,
  },
  {
    key: "wound",
    title: "Wound or Injury",
    description: "New wound, injury, or unexplained mark",
    Icon: Bandage,
  },
]

function TypeSelectScreen({
  onSelectType,
  disabled,
}: {
  onSelectType: (typeKey: string) => void
  disabled: boolean
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-3 pb-6 pt-3 sm:px-4 sm:pb-8 sm:pt-4">
      <ReportStepHeader
        back={{ href: "/staff/dashboard", ariaLabel: "Back to dashboard" }}
        title="New incident report"
        description="Choose the situation type. You’ll link a resident next."
      />
      <div className="mt-3 grid auto-rows-min grid-cols-1 content-start gap-3 sm:grid-cols-2 sm:gap-3">
        {INCIDENT_TYPE_PRESETS.map((t) => {
          const Icon = t.Icon
          const supported = REPORT_START_SUPPORTED_TYPES.has(t.key)
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled || !supported}
              title={`${t.title} — ${t.description}`}
              aria-label={supported ? `${t.title}. ${t.description}` : `${t.title}. ${t.description}. Coming soon.`}
              onClick={() => supported && onSelectType(t.key)}
              className={cn(
                "flex min-h-[5.5rem] w-full cursor-pointer items-center gap-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.03] px-3 py-3 text-left shadow-sm transition-all sm:min-h-[6rem] sm:gap-3.5 sm:px-3.5 sm:py-3.5",
                "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-primary/15 disabled:hover:shadow-sm",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-11 sm:w-11">
                <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="line-clamp-1 text-left text-sm font-semibold leading-snug text-foreground">
                    {t.title}
                  </span>
                  {!supported ? (
                    <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 line-clamp-2 text-left text-xs leading-snug text-muted-foreground sm:text-[0.8125rem]">
                  {t.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResidentSplashScreen({
  incidentTitle,
  selectedResident,
  onResidentChange,
  onStart,
  onBack,
  disabled,
  isStarting,
  facilityId,
  organizationId,
}: {
  incidentTitle: string
  selectedResident: StaffResidentSearchOption | null
  onResidentChange: (r: StaffResidentSearchOption | null) => void
  onStart: () => void
  onBack: () => void
  disabled: boolean
  isStarting: boolean
  facilityId?: string
  organizationId?: string
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-3 pb-6 pt-3 sm:px-4 sm:pb-8 sm:pt-4">
      <ReportStepHeader
        back={{ onClick: onBack, disabled, ariaLabel: "Back to incident type" }}
        title="Link resident"
        description={`${incidentTitle} · Required before voice questions.`}
      />
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="report-resident-search">
            Resident
          </label>
          <StaffResidentSearch
            inputId="report-resident-search"
            value={selectedResident}
            onChange={onResidentChange}
            disabled={disabled || isStarting}
            facilityId={facilityId}
            organizationId={organizationId}
          />
        </div>
        <Button
          type="button"
          className="min-h-11 w-full rounded-xl text-sm font-semibold shadow-md sm:min-h-12 sm:text-base"
          onClick={onStart}
          disabled={disabled || isStarting || !selectedResident}
        >
          {isStarting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting…
            </span>
          ) : (
            "Start report"
          )}
        </Button>
      </div>
    </div>
  )
}

function mapServerReportPhase(reportPhase: string): ReportPhase {
  switch (reportPhase) {
    case "tier1":
      return "tier1_board"
    case "tier2":
      return "tier2_board"
    case "closing":
      return "closing"
    default:
      return "tier1_board"
  }
}

function applyEditsToClinicalRecord(
  record: ClinicalRecord,
  edits: Record<string, string>,
): ClinicalRecord {
  return { ...record, ...edits }
}

function isClosingBoardComplete(
  questions: BoardQuestion[],
  answeredIds: Set<string>,
  answers: Record<string, string>,
): boolean {
  return (
    questions.length > 0 &&
    questions.every((q) => answeredIds.has(q.id) && (answers[q.id] ?? "").trim().length > 0)
  )
}

export default function StaffReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, role } = useWaikUser()

  const resumeIncidentId = searchParams.get("incidentId")?.trim() ?? ""

  const reportFacilityScope = useMemo(() => {
    const fromUrlFacility = searchParams.get("facilityId")?.trim() ?? ""
    const fromUrlOrg = searchParams.get("organizationId")?.trim() ?? ""
    if (fromUrlFacility) {
      return { facilityId: fromUrlFacility, organizationId: fromUrlOrg || undefined }
    }
    const saved = readAdminScopeFromSession()
    if (saved?.facilityId) {
      return {
        facilityId: saved.facilityId,
        organizationId: saved.organizationId || undefined,
      }
    }
    return null
  }, [searchParams])

  const [phase, setPhase] = useState<ReportPhase>(resumeIncidentId ? "gap_analysis" : "type_select")
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null)
  const [selectedResident, setSelectedResident] = useState<StaffResidentSearchOption | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(() => new Set())
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [completionPercent, setCompletionPercent] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeLoading, setResumeLoading] = useState(Boolean(resumeIncidentId))
  const [currentQuestionStartMs, setCurrentQuestionStartMs] = useState(0)

  const [tier1Questions, setTier1Questions] = useState<BoardQuestion[]>([])
  const [tier2Questions, setTier2Questions] = useState<BoardQuestion[]>([])
  const [closingQuestions, setClosingQuestions] = useState<BoardQuestion[]>([])
  const [tier2RemovedIds, setTier2RemovedIds] = useState<string[]>([])
  const [tier2NewIds, setTier2NewIds] = useState<string[]>([])
  const [gapRetryNeeded, setGapRetryNeeded] = useState(false)
  const [gapWarningMessage, setGapWarningMessage] = useState<string | null>(null)
  const [reportResidentName, setReportResidentName] = useState<string | null>(null)
  const [reportResidentRoom, setReportResidentRoom] = useState<string | null>(null)
  const [reportIncidentType, setReportIncidentType] = useState<string | null>(null)

  const [reportCardData, setReportCardData] = useState<ReportCardPayload | null>(null)
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord | null>(null)
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const gapTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const workflowPercent = useMemo(() => {
    const tier2Ids = new Set(tier2Questions.map((q) => q.id))
    for (const id of Object.keys(answers)) {
      if (id.startsWith("t2-q")) tier2Ids.add(id)
    }
    return computeWorkflowFromAnswerMap({
      tier1Ids: tier1Questions.map((q) => q.id),
      tier2Ids: [...tier2Ids],
      closingIds: closingQuestions.map((q) => q.id),
      answers,
      tier2Generated: tier2Ids.size > 0,
    })
  }, [answers, closingQuestions, tier1Questions, tier2Questions])

  useEffect(() => {
    return () => {
      if (gapTransitionRef.current) clearTimeout(gapTransitionRef.current)
    }
  }, [])

  const resetToSplash = useCallback(() => {
    if (gapTransitionRef.current) {
      clearTimeout(gapTransitionRef.current)
      gapTransitionRef.current = null
    }
    setPhase("type_select")
    setSelectedTypeKey(null)
    setSelectedResident(null)
    setActiveQuestion(null)
    setAnswers({})
    setAnsweredIds(new Set())
    setIncidentId(null)
    setSessionId(null)
    setCompletionPercent(0)
    setTier1Questions([])
    setTier2Questions([])
    setClosingQuestions([])
    setTier2RemovedIds([])
    setTier2NewIds([])
    setGapRetryNeeded(false)
    setGapWarningMessage(null)
    setReportResidentName(null)
    setReportResidentRoom(null)
    setReportIncidentType(null)
    setReportCardData(null)
    setClinicalRecord(null)
    setPreviewData(null)
    setPreviewError(null)
  }, [])

  const loadClinicalPreview = useCallback(async (sid: string) => {
    setPreviewError(null)
    setPhase("preview_loading")
    try {
      const previewRes = await fetch("/api/report/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })
      const previewPayload = (await previewRes.json()) as PreviewResponse & { error?: string }
      if (!previewRes.ok) {
        throw new Error(
          typeof previewPayload.error === "string"
            ? previewPayload.error
            : "Failed to prepare clinical preview",
        )
      }
      setPreviewData(previewPayload)
      setClinicalRecord(previewPayload.clinicalRecord)
      setPhase("clinical_preview")
    } catch (previewErr) {
      console.error(previewErr)
      const msg =
        previewErr instanceof Error ? previewErr.message : "Could not prepare clinical preview"
      setPreviewError(msg)
      setPhase("preview_error")
      toast.error(msg)
    }
  }, [])

  const hydrateFromResume = useCallback((data: Record<string, unknown>): boolean => {
    const sid = typeof data.sessionId === "string" ? data.sessionId : null
    const iid = typeof data.incidentId === "string" ? data.incidentId : null
    if (!sid || !iid) return false

    setSessionId(sid)
    setIncidentId(iid)
    setReportResidentName(typeof data.residentName === "string" ? data.residentName : null)
    setReportResidentRoom(typeof data.residentRoom === "string" ? data.residentRoom : null)
    setReportIncidentType(typeof data.incidentType === "string" ? data.incidentType : null)
    setTier1Questions((data.tier1Questions as BoardQuestion[] | undefined) ?? [])
    setTier2Questions((data.tier2Questions as BoardQuestion[] | undefined) ?? [])
    setClosingQuestions((data.closingQuestions as BoardQuestion[] | undefined) ?? [])

    const answerMap = (data.answers as Record<string, string> | undefined) ?? {}
    setAnswers(answerMap)
    const ids = (data.answeredIds as string[] | undefined) ?? []
    setAnsweredIds(new Set(ids))

    if (typeof data.completenessScore === "number") {
      setCompletionPercent(data.completenessScore)
    }

    const warning = typeof data.warning === "string" ? data.warning : null
    if (warning) {
      toast.message(warning)
    }

    const tier2 = (data.tier2Questions as BoardQuestion[] | undefined) ?? []
    setGapRetryNeeded(tier2.length === 0)
    setGapWarningMessage(warning)

    const serverPhase = typeof data.reportPhase === "string" ? data.reportPhase : "tier1"
    if (serverPhase === "signoff") {
      return true
    }
    setPhase(mapServerReportPhase(serverPhase))
    return false
  }, [])

  useEffect(() => {
    if (!resumeIncidentId || !userId) {
      setResumeLoading(false)
      return
    }

    let cancelled = false
    setResumeLoading(true)

    void (async () => {
      try {
        const res = await fetch(
          `/api/report/resume?incidentId=${encodeURIComponent(resumeIncidentId)}`,
          { credentials: "include" },
        )
        const data = (await res.json()) as Record<string, unknown>
        if (cancelled) return

        if (!res.ok) {
          const err = typeof data.error === "string" ? data.error : "Could not resume this report"
          toast.error(err)
          setPhase("type_select")
          return
        }

        if (data.status === "session_active" || data.sessionId) {
          const needsPreview = hydrateFromResume(data)
          const sid = typeof data.sessionId === "string" ? data.sessionId : null
          if (needsPreview && sid) {
            await loadClinicalPreview(sid)
          }
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          toast.error("Could not load saved report progress")
          setPhase("type_select")
        }
      } finally {
        if (!cancelled) setResumeLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrateFromResume, loadClinicalPreview, resumeIncidentId, userId])

  const applyGapAnalysisComplete = useCallback((data: Record<string, unknown>) => {
    const nextTier2 = (data.tier2Questions as BoardQuestion[] | undefined) ?? []
    const warning = typeof data.warning === "string" ? data.warning : null
    if (typeof data.completenessScore === "number") {
      setCompletionPercent(data.completenessScore)
    }
    setTier2Questions(nextTier2)
    setTier2NewIds(nextTier2.map((q) => q.id))
    setGapWarningMessage(warning)
    setGapRetryNeeded(nextTier2.length === 0)
    setPhase("gap_analysis")
    if (gapTransitionRef.current) clearTimeout(gapTransitionRef.current)
    gapTransitionRef.current = setTimeout(() => {
      setPhase("tier2_board")
      setTier2NewIds([])
      gapTransitionRef.current = null
    }, 1500)
  }, [])

  const openQuestion = useCallback((q: BoardQuestion) => {
    setActiveQuestion(toActiveQuestion(q))
    setCurrentQuestionStartMs(Date.now())
    setPhase("answering")
  }, [])

  const returnToBoard = useCallback((tier: "tier1" | "tier2" | "closing") => {
    setActiveQuestion(null)
    if (tier === "tier1") {
      setPhase("tier1_board")
    } else if (tier === "tier2") {
      setPhase("tier2_board")
    } else {
      setPhase("closing")
    }
  }, [])

  const handleDeferAll = useCallback(async () => {
    if (!sessionId) {
      toast.error("Session expired. Start again from the dashboard.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/report/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: "__DEFER_ALL__",
          transcript: "",
          tier: "tier2",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || "Could not save progress")
      }
      toast.success("Progress saved. Continue later from your dashboard.")
      router.push("/staff/dashboard")
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Could not defer questions.")
    } finally {
      setIsSubmitting(false)
    }
  }, [router, sessionId])

  const handleRetryGap = useCallback(async () => {
    if (!sessionId) {
      toast.error("Session expired. Start again from the dashboard.")
      return
    }
    setIsSubmitting(true)
    setPhase("gap_analysis")
    try {
      const res = await fetch("/api/report/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: "__RETRY_GAP__",
          transcript: "",
          tier: "tier2",
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        const retryable = data.retryable === true
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : retryable
              ? "Could not regenerate questions. Try again."
              : "Failed to regenerate follow-up questions",
        )
      }
      if (data.status !== "gap_analysis_complete") {
        throw new Error("Unexpected response from server.")
      }
      applyGapAnalysisComplete(data)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Could not regenerate follow-up questions")
      setPhase("tier2_board")
    } finally {
      setIsSubmitting(false)
    }
  }, [applyGapAnalysisComplete, sessionId])

  const handleAnswer = useCallback(
    async (question: ActiveQuestion, transcript: string) => {
      if (!sessionId) {
        toast.error("Missing session. Start the report again.")
        return
      }
      const activeMs = Math.max(0, Date.now() - currentQuestionStartMs)
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/report/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: question.id,
            transcript: transcript.trim(),
            tier: question.tier,
            activeMs,
            questionText: question.text,
            areaHint: question.areaHint ?? (question.tier === "tier2" ? "Follow-up" : "General"),
          }),
        })
        const data = (await res.json()) as Record<string, unknown>
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to submit answer")
        }

        const status = data.status as string | undefined
        if (typeof data.completenessScore === "number") {
          setCompletionPercent(data.completenessScore)
        }

        setAnsweredIds((prev) => new Set([...prev, question.id]))
        setAnswers((prev) => ({ ...prev, [question.id]: transcript.trim() }))

        switch (status) {
          case "tier1_updated":
            setActiveQuestion(null)
            setPhase("tier1_board")
            break

          case "gap_analysis_complete":
            applyGapAnalysisComplete(data)
            break

          case "tier2_updated": {
            const removed = (data.questionsRemoved as string[] | undefined) ?? []
            const remaining = (data.remainingQuestions as BoardQuestion[] | undefined) ?? []
            const oldIds = new Set(tier2Questions.map((q) => q.id))
            const newIds = remaining.filter((q) => !oldIds.has(q.id)).map((q) => q.id)

            const applyBoard = () => {
              setTier2Questions(remaining)
              setTier2RemovedIds([])
              setTier2NewIds(newIds)
              setActiveQuestion(null)
              setPhase("tier2_board")
              window.setTimeout(() => setTier2NewIds([]), 500)
            }

            if (removed.length > 0) {
              setTier2RemovedIds(removed)
              window.setTimeout(applyBoard, 320)
            } else {
              applyBoard()
            }
            break
          }

          case "closing_ready": {
            const cq = (data.closingQuestions as BoardQuestion[] | undefined) ?? []
            setClosingQuestions(cq)
            setActiveQuestion(null)
            setPhase("closing")
            break
          }

          case "closing_updated": {
            const allDone = data.allClosingComplete === true
            setActiveQuestion(null)
            if (allDone && sessionId) {
              await loadClinicalPreview(sessionId)
            } else {
              setPhase("closing")
            }
            break
          }

          default:
            toast.message("Unexpected response from server.")
            setActiveQuestion(null)
            returnToBoard(question.tier)
        }
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : "Failed to submit answer")
      } finally {
        setIsSubmitting(false)
      }
    },
    [applyGapAnalysisComplete, currentQuestionStartMs, loadClinicalPreview, returnToBoard, sessionId, tier2Questions],
  )

  const handleDeferOne = useCallback(
    async (question: ActiveQuestion) => {
      if (!sessionId) {
        toast.error("Session expired. Start again from the dashboard.")
        return
      }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/report/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: "__DEFER_ONE__",
            deferQuestionId: question.id,
            transcript: "",
            tier: "tier2",
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          throw new Error(data.error || "Could not defer this question")
        }
        setAnswers((prev) => ({ ...prev, [question.id]: "__DEFERRED__" }))
        setActiveQuestion(null)
        returnToBoard("tier2")
        toast.success("Question deferred. Continue other follow-ups or return when ready.")
      } catch (e) {
        console.error(e)
        toast.error(e instanceof Error ? e.message : "Could not defer this question.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [returnToBoard, sessionId],
  )

  const handleVoiceDefer = useCallback(
    (question: ActiveQuestion) => {
      if (question.tier === "tier2") {
        void handleDeferOne(question)
      }
    },
    [handleDeferOne],
  )

  const submitSignedReport = useCallback(
    async (
      sigImage: string,
      edits: Record<string, string>,
      record: ClinicalRecord,
    ) => {
      if (!sessionId) {
        toast.error("Session missing.")
        return
      }
      if (!sigImage.trim()) {
        toast.error("Signature required before submitting.")
        return
      }
      setClinicalRecord(record)
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/report/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            editedSections: Object.keys(edits).length > 0 ? edits : undefined,
            clinicalRecord: record,
            signatureImage: sigImage,
            signature: {
              declaration: "I confirm this report reflects my observations and actions.",
              signedAt: new Date().toISOString(),
            },
          }),
        })
        const data = (await res.json()) as { error?: string; reportCard?: ReportCardPayload }
        if (!res.ok) {
          throw new Error(data.error || "Failed to complete report")
        }
        if (data.reportCard) {
          setReportCardData(data.reportCard)
        }
        setPhase("reportcard")
        toast.success("Report signed and submitted.")
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : "Failed to submit report")
      } finally {
        setIsSubmitting(false)
      }
    },
    [sessionId],
  )

  const handleTypeSelect = useCallback((typeKey: string) => {
    setSelectedTypeKey(typeKey)
    setSelectedResident(null)
    setPhase("resident_splash")
  }, [])

  const createDraftIncident = useCallback(async () => {
    if (!userId) {
      toast.error("Sign in to create a report.")
      return
    }
    if (!selectedTypeKey || !selectedResident) {
      toast.error("Select an incident type and resident.")
      return
    }
    if (!REPORT_START_SUPPORTED_TYPES.has(selectedTypeKey)) {
      toast.error("This incident type is not available yet. Choose Fall.")
      return
    }
    const fullName = [selectedResident.firstName, selectedResident.lastName].filter(Boolean).join(" ")
    const room = selectedResident.roomNumber.trim()
    setIsCreating(true)
    try {
      const res = await fetch("/api/report/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentType: selectedTypeKey,
          residentId: selectedResident.id,
          residentName: fullName,
          residentRoom: room || "—",
          location: room ? `Room ${room}` : "Unknown",
          incidentDate: new Date().toISOString().split("T")[0],
          incidentTime: new Date().toTimeString().slice(0, 5),
          hasInjury: null,
          witnessesPresent: undefined,
          ...(reportFacilityScope
            ? {
                facilityId: reportFacilityScope.facilityId,
                ...(reportFacilityScope.organizationId
                  ? { organizationId: reportFacilityScope.organizationId }
                  : {}),
              }
            : {}),
        }),
      })
      const data = (await res.json()) as {
        error?: string
        sessionId?: string
        incidentId?: string
        tier1Questions?: BoardQuestion[]
        completenessScore?: number
      }
      if (!res.ok) {
        throw new Error(data.error || "Failed to start report")
      }
      if (!data.sessionId || !data.incidentId || !data.tier1Questions) {
        throw new Error("Invalid start response")
      }
      setSessionId(data.sessionId)
      setIncidentId(data.incidentId)
      setReportResidentName(fullName)
      setReportResidentRoom(room || null)
      setReportIncidentType(selectedTypeKey)
      setTier1Questions(data.tier1Questions)
      setTier2Questions([])
      setClosingQuestions([])
      setAnswers({})
      setAnsweredIds(new Set())
      setCompletionPercent(typeof data.completenessScore === "number" ? data.completenessScore : 0)
      setPhase("tier1_board")
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.")
    } finally {
      setIsCreating(false)
    }
  }, [userId, selectedTypeKey, selectedResident, reportFacilityScope])

  const handleBackFromResident = useCallback(() => {
    setSelectedResident(null)
    setSelectedTypeKey(null)
    setPhase("type_select")
  }, [])

  const handleFinishDashboard = useCallback(() => {
    const destination = role === "admin" ? "/admin/dashboard" : "/staff/dashboard"
    router.push(destination)
  }, [role, router])

  const reportContextLine = buildReportContextLine(
    reportResidentName,
    reportResidentRoom,
    reportIncidentType,
  )
  const incidentDetailHref = incidentId ? `/staff/incidents/${incidentId}` : undefined

  function renderPhase() {
    if (resumeLoading) {
      return (
        <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4 py-8">
          <div className={cn(FLOW_CARD, "flex max-w-sm flex-col items-center gap-3 px-6 py-8")}>
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-center text-sm font-medium text-foreground">Loading your report…</p>
            <p className="text-center text-xs text-muted-foreground">Restoring saved progress</p>
          </div>
        </div>
      )
    }

    switch (phase) {
      case "type_select":
        return <TypeSelectScreen onSelectType={handleTypeSelect} disabled={isCreating} />

      case "resident_splash": {
        const title =
          INCIDENT_TYPE_PRESETS.find((p) => p.key === (selectedTypeKey ?? ""))?.title ?? "Incident"
        return (
          <ResidentSplashScreen
            incidentTitle={title}
            selectedResident={selectedResident}
            onResidentChange={setSelectedResident}
            onStart={createDraftIncident}
            onBack={handleBackFromResident}
            disabled={isCreating}
            isStarting={isCreating}
            facilityId={reportFacilityScope?.facilityId}
            organizationId={reportFacilityScope?.organizationId}
          />
        )
      }

      case "tier1_board":
        return (
          <QuestionBoard
            title="Initial Questions"
            contextLine={reportContextLine}
            questions={tier1Questions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={workflowPercent}
            onQuestionTap={openQuestion}
            isSubmitting={isSubmitting}
          />
        )

      case "answering": {
        if (!activeQuestion) {
          return null
        }
        const vi: VoiceInputScreenProps = {
          question: activeQuestion.text,
          questionLabel: activeQuestion.label,
          reportContextLine,
          areaHint: activeQuestion.areaHint,
          initialTranscript: (() => {
            const raw = answers[activeQuestion.id]?.trim() ?? ""
            if (raw === "__DEFERRED__" || raw === "__UNKNOWN__") return undefined
            return answers[activeQuestion.id]
          })(),
          allowDefer: activeQuestion.allowDefer,
          showEncouragement: activeQuestion.tier === "tier2",
          completionRingPercent: workflowPercent,
          onSubmit: (transcript) => {
            void handleAnswer(activeQuestion, transcript)
          },
          onDefer:
            activeQuestion.tier === "tier2" && activeQuestion.allowDefer
              ? () => handleVoiceDefer(activeQuestion)
              : undefined,
          onBack: () => returnToBoard(activeQuestion.tier),
        }
        return (
          <div className="relative w-full max-md:flex-none md:min-h-0 md:flex-1">
            <VoiceInputScreen {...vi} />
            {isSubmitting ? (
              <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/85 px-6"
                aria-busy
                aria-live="polite"
              >
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-center text-sm text-muted-foreground">Saving your answer…</p>
              </div>
            ) : null}
          </div>
        )
      }

      case "gap_analysis":
        return (
          <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4 py-8">
            <div className={cn(FLOW_CARD, "flex max-w-sm flex-col items-center gap-3 px-6 py-8")}>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <div className="flex justify-center text-foreground">
                <WaikLogo size="md" />
              </div>
              <p className="text-center text-sm font-medium text-foreground">Analyzing your report…</p>
              <p className="text-center text-xs text-muted-foreground">Generating follow-up questions</p>
            </div>
          </div>
        )

      case "tier2_board":
        if (tier2Questions.length === 0 && gapRetryNeeded) {
          return (
            <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4 py-8">
              <div className={cn(FLOW_CARD, "flex max-w-sm flex-col items-center gap-4 px-6 py-8 text-center")}>
                <p className="text-sm font-medium text-foreground">Follow-up questions not ready</p>
                <p className="text-xs text-muted-foreground">
                  {gapWarningMessage ??
                    "We couldn't generate follow-up questions. Check your connection and try again."}
                </p>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={isSubmitting}
                  onClick={() => void handleRetryGap()}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Retry
                </Button>
              </div>
            </div>
          )
        }
        return (
          <QuestionBoard
            title="Follow-up Questions"
            contextLine={reportContextLine}
            detailBackHref={incidentDetailHref}
            questions={tier2Questions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={workflowPercent}
            onQuestionTap={openQuestion}
            onDeferAll={handleDeferAll}
            isSubmitting={isSubmitting}
            removedIds={tier2RemovedIds}
            newIds={tier2NewIds}
          />
        )

      case "closing": {
        const closingComplete = isClosingBoardComplete(closingQuestions, answeredIds, answers)
        return (
          <QuestionBoard
            title="Closing Questions"
            contextLine={reportContextLine}
            detailBackHref={incidentDetailHref}
            questions={closingQuestions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={workflowPercent}
            onQuestionTap={openQuestion}
            isSubmitting={isSubmitting}
            footerAction={
              closingComplete && sessionId
                ? {
                    label: "Review & sign report",
                    onClick: () => void loadClinicalPreview(sessionId),
                    disabled: isSubmitting,
                  }
                : undefined
            }
          />
        )
      }

      case "preview_loading":
        return (
          <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4 py-8">
            <div className={cn(FLOW_CARD, "flex max-w-sm flex-col items-center gap-3 px-6 py-8")}>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <div className="flex justify-center text-foreground">
                <WaikLogo size="md" />
              </div>
              <p className="text-center text-sm font-medium text-foreground">
                WAiK is preparing your clinical summary and record for review…
              </p>
              <p className="text-center text-xs text-muted-foreground">This may take a few seconds</p>
            </div>
          </div>
        )

      case "clinical_preview":
        return previewData ? (
          <ClinicalReportPreview
            previewData={previewData}
            isSubmitting={isSubmitting}
            onBack={() => setPhase("closing")}
            onSubmit={(sigImage, edits) => {
              const base = clinicalRecord ?? previewData.clinicalRecord
              void submitSignedReport(sigImage, edits, applyEditsToClinicalRecord(base, edits))
            }}
          />
        ) : null

      case "preview_error":
        return (
          <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4 py-8">
            <div className={cn(FLOW_CARD, "flex max-w-sm flex-col items-center gap-4 px-6 py-8 text-center")}>
              <p className="text-sm font-medium text-foreground">Could not prepare your clinical record</p>
              <p className="text-xs text-muted-foreground">
                {previewError ??
                  "Check your connection and try again. You must review and sign your report before submitting."}
              </p>
              <div className="flex w-full flex-col gap-2">
                {sessionId ? (
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={isSubmitting}
                    onClick={() => void loadClinicalPreview(sessionId)}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Retry preview
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPhase("closing")}
                >
                  Back to closing questions
                </Button>
              </div>
            </div>
          </div>
        )

      case "reportcard": {
        const card = reportCardData
        return (
          <div className="flex min-h-0 flex-1 flex-col px-3 py-6 sm:px-4 sm:py-8">
            <WaikCard className={cn("mx-auto w-full max-w-lg border-primary/20 shadow-md", FLOW_CARD)}>
              <WaikCardContent className="space-y-3 px-5 py-6 text-center sm:px-6 sm:py-7">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">Complete</p>
                <p className="text-lg font-semibold tracking-tight text-foreground">Report submitted</p>
                {card ? (
                  <div className="space-y-3 text-left text-sm">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-primary/10 bg-muted/30 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Your score</p>
                        <p className="text-xl font-bold text-foreground">{card.completenessScore}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Facility avg</p>
                        <p className="text-xl font-bold text-foreground">{card.facilityAverage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Personal avg</p>
                        <p className="text-lg font-semibold text-foreground">{card.personalAverage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Streak</p>
                        <p className="text-lg font-semibold text-foreground">
                          {card.currentStreak} / best {card.bestStreak}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/80">Coaching</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {(card.coachingTips ?? []).map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Questions asked: {card.totalQuestionsAsked} · Active time: {card.totalActiveSeconds}s · Data
                      points: {card.dataPointsCaptured}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Your report was submitted successfully.</p>
                )}
                {card?.pdfStatus ? (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {card.pdfStatus}
                  </p>
                ) : null}
                {incidentId ? (
                  <p className="text-xs text-muted-foreground">
                    Incident <span className="font-mono">{incidentId}</span>
                  </p>
                ) : null}
                <ReportCompletionFeedback incidentId={incidentId} />
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-xl text-sm font-semibold shadow-md sm:min-h-12 sm:text-base"
                  onClick={handleFinishDashboard}
                >
                  Finish and return to dashboard
                </Button>
              </WaikCardContent>
            </WaikCard>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <ErrorBoundary onReset={resetToSplash}>
      <StaffFlowFrame>{renderPhase()}</StaffFlowFrame>
    </ErrorBoundary>
  )
}
