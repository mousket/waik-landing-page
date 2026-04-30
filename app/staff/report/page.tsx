"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bandage, Footprints, Loader2, Pill, Zap, type LucideIcon } from "lucide-react"

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
import { cn } from "@/lib/utils"

const FLOW_CARD =
  "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04] shadow-md"

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
  | "signoff"
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
}: {
  incidentTitle: string
  selectedResident: StaffResidentSearchOption | null
  onResidentChange: (r: StaffResidentSearchOption | null) => void
  onStart: () => void
  onBack: () => void
  disabled: boolean
  isStarting: boolean
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

export default function StaffReportPage() {
  const router = useRouter()
  const { userId, role } = useWaikUser()

  const [phase, setPhase] = useState<ReportPhase>("type_select")
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
  const [currentQuestionStartMs, setCurrentQuestionStartMs] = useState(0)

  const [tier1Questions, setTier1Questions] = useState<BoardQuestion[]>([])
  const [tier2Questions, setTier2Questions] = useState<BoardQuestion[]>([])
  const [closingQuestions, setClosingQuestions] = useState<BoardQuestion[]>([])
  const [tier2RemovedIds, setTier2RemovedIds] = useState<string[]>([])
  const [tier2NewIds, setTier2NewIds] = useState<string[]>([])

  const [reportCardData, setReportCardData] = useState<ReportCardPayload | null>(null)

  const gapTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setReportCardData(null)
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

          case "gap_analysis_complete": {
            const nextTier2 = (data.tier2Questions as BoardQuestion[] | undefined) ?? []
            setTier2Questions(nextTier2)
            setTier2NewIds(nextTier2.map((q) => q.id))
            setPhase("gap_analysis")
            if (gapTransitionRef.current) clearTimeout(gapTransitionRef.current)
            gapTransitionRef.current = setTimeout(() => {
              setPhase("tier2_board")
              setTier2NewIds([])
              gapTransitionRef.current = null
            }, 1500)
            break
          }

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
            setPhase(allDone ? "signoff" : "closing")
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
    [currentQuestionStartMs, returnToBoard, sessionId, tier2Questions],
  )

  const handleVoiceDefer = useCallback(
    (question: ActiveQuestion) => {
      if (question.tier === "tier2") {
        void handleDeferAll()
      }
    },
    [handleDeferAll],
  )

  const handleSignOff = useCallback(async () => {
    if (!sessionId) {
      toast.error("Session missing.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/report/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          editedSections: undefined,
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
      toast.error(err instanceof Error ? err.message : "Failed to sign off")
    } finally {
      setIsSubmitting(false)
    }
  }, [sessionId])

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
  }, [userId, selectedTypeKey, selectedResident])

  const handleBackFromResident = useCallback(() => {
    setSelectedResident(null)
    setSelectedTypeKey(null)
    setPhase("type_select")
  }, [])

  const handleFinishDashboard = useCallback(() => {
    const destination = role === "admin" ? "/admin/dashboard" : "/staff/dashboard"
    router.push(destination)
  }, [role, router])

  function renderPhase() {
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
          />
        )
      }

      case "tier1_board":
        return (
          <QuestionBoard
            title="Initial Questions"
            questions={tier1Questions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={completionPercent}
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
          areaHint: activeQuestion.areaHint,
          initialTranscript: answers[activeQuestion.id],
          allowDefer: activeQuestion.allowDefer,
          showEncouragement: activeQuestion.tier === "tier2",
          completionRingPercent: completionPercent,
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
        return (
          <QuestionBoard
            title="Follow-up Questions"
            questions={tier2Questions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={completionPercent}
            onQuestionTap={openQuestion}
            onDeferAll={handleDeferAll}
            isSubmitting={isSubmitting}
            removedIds={tier2RemovedIds}
            newIds={tier2NewIds}
          />
        )

      case "closing":
        return (
          <QuestionBoard
            title="Closing Questions"
            questions={closingQuestions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={completionPercent}
            onQuestionTap={openQuestion}
            isSubmitting={isSubmitting}
          />
        )

      case "signoff":
        return (
          <div className="flex min-h-0 flex-1 flex-col px-3 py-6 sm:px-4 sm:py-8">
            <WaikCard className={cn("mx-auto w-full max-w-lg border-primary/20 shadow-md", FLOW_CARD)}>
              <WaikCardContent className="space-y-3 px-5 py-6 text-center sm:px-6 sm:py-7">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/80">Sign off</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  By continuing, you confirm this report reflects your observations and actions. Your narrative and
                  structured record will be saved for Phase 2 review.
                </p>
                {incidentId ? (
                  <p className="text-xs text-muted-foreground">
                    Incident <span className="font-mono">{incidentId}</span>
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-xl text-sm font-semibold shadow-md sm:min-h-12 sm:text-base"
                  onClick={() => void handleSignOff()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Sign and submit report"
                  )}
                </Button>
              </WaikCardContent>
            </WaikCard>
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
                {incidentId ? (
                  <p className="text-xs text-muted-foreground">
                    Incident <span className="font-mono">{incidentId}</span>
                  </p>
                ) : null}
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
