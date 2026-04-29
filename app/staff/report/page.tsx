"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Bandage, Footprints, Loader2, Pill, Zap, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import VoiceInputScreen, { type VoiceInputScreenProps } from "@/components/voice-input-screen"
import { WaikLogo } from "@/components/waik-logo"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { useWaikUser } from "@/hooks/use-waik-user"
import { StaffResidentSearch, type StaffResidentSearchOption } from "@/components/staff/resident-search"
import { QuestionBoard } from "@/components/staff/question-board"
import { cn } from "@/lib/utils"

const TEAL_HEADER = "w-full bg-[#0A3D40] px-4 py-4 text-white md:mx-auto md:max-w-lg md:rounded-b-2xl"

// --- State machine (task-03e) — props for VoiceInputScreen are fixed in task-03d. ---

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
  required?: boolean
}

type ApiQuestion = {
  id: string
  text: string
  label: string
  areaHint?: string
  tier: string
  allowDefer: boolean
  required?: boolean
}

type ReportCardData = {
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

function toActiveQuestion(q: ApiQuestion): ActiveQuestion {
  const tier: ActiveQuestion["tier"] =
    q.tier === "tier1" || q.tier === "tier2" || q.tier === "closing"
      ? q.tier
      : "tier1"
  return {
    id: q.id,
    text: q.text,
    label: q.label,
    areaHint: q.areaHint,
    tier,
    allowDefer: q.allowDefer,
    required: q.required,
  }
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

function completionFromAnswers(answers: Record<string, string>): number {
  const n = Object.entries(answers).filter(([, v]) => v && v !== "__DEFERRED__").length
  return Math.min(100, n * 18)
}

function TypeSelectScreen({
  onSelectType,
  disabled,
}: {
  onSelectType: (typeKey: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={TEAL_HEADER}>
        <div className="mb-1 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/staff/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <h1 className="px-0 text-xl font-bold text-white">New Incident Report</h1>
        <p className="mt-1 text-sm text-white/60">Select the type of incident</p>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:pt-4">
        {INCIDENT_TYPE_PRESETS.map((t) => {
          const Icon = t.Icon
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectType(t.key)}
              className={cn(
                "min-h-20 w-full cursor-pointer rounded-xl border border-border/80 bg-background p-5 text-left shadow-sm",
                "flex items-start gap-3 transition-all hover:border-teal-500/50 hover:shadow-sm",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[#0D7377]">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-[#0A3D40] dark:text-foreground">{t.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.description}</span>
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
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-0">
      <div className={TEAL_HEADER}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={disabled}
          className="mb-1 h-11 w-11 text-white hover:bg-white/10 hover:text-white"
          aria-label="Back to incident type"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-white">New Incident Report</h1>
        <p className="mt-0.5 text-sm text-white/60">{incidentTitle}</p>
        <p className="mt-1 text-sm text-white/50">Link this report to a resident (required).</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="report-resident-search">
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
          className="min-h-12 w-full rounded-xl text-base font-semibold shadow-md"
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
  const { userId, name, role } = useWaikUser()

  const [phase, setPhase] = useState<ReportPhase>("type_select")
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null)
  const [selectedResident, setSelectedResident] = useState<StaffResidentSearchOption | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [tier1Questions, setTier1Questions] = useState<ActiveQuestion[]>([])
  const [tier2Questions, setTier2Questions] = useState<ActiveQuestion[]>([])
  const [closingQuestions, setClosingQuestions] = useState<ActiveQuestion[]>([])
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [completionPercent, setCompletionPercent] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentQuestionStartMs, setCurrentQuestionStartMs] = useState(0)
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null)

  useEffect(() => {
    setCompletionPercent((prev) => (prev > 0 ? prev : completionFromAnswers(answers)))
  }, [answers])

  const resetToSplash = useCallback(() => {
    setPhase("type_select")
    setSelectedTypeKey(null)
    setSelectedResident(null)
    setActiveQuestion(null)
    setAnswers({})
    setAnsweredIds(new Set())
    setTier1Questions([])
    setTier2Questions([])
    setClosingQuestions([])
    setIncidentId(null)
    setSessionId(null)
    setCompletionPercent(0)
    setReportCardData(null)
  }, [])

  const openQuestion = useCallback((q: ActiveQuestion) => {
    setActiveQuestion(q)
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

  const handleAnswer = useCallback(
    async (question: ActiveQuestion, transcript: string) => {
      const trimmed = transcript.trim()
      const activeMs = Math.max(0, Date.now() - currentQuestionStartMs)

      // Local optimistic update so the UI reflects the answer immediately.
      setAnswers((prev) => ({ ...prev, [question.id]: trimmed }))
      setAnsweredIds((prev) => new Set(prev).add(question.id))

      if (!sessionId) {
        // No live session (offline draft). Fall back to local-only behaviour.
        returnToBoard(question.tier)
        return
      }

      setIsSubmitting(true)
      try {
        const res = await fetch("/api/report/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: question.id,
            transcript: trimmed,
            tier: question.tier,
            activeMs,
          }),
        })

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error || "Failed to submit answer")
        }

        const data = (await res.json()) as {
          status: string
          completenessScore?: number
          tier2Questions?: ApiQuestion[]
          remainingQuestions?: ApiQuestion[]
          newQuestions?: ApiQuestion[]
          questionsRemoved?: string[]
          closingQuestions?: ApiQuestion[]
          allClosingComplete?: boolean
        }

        if (typeof data.completenessScore === "number") {
          setCompletionPercent(data.completenessScore)
        }

        // Drop questions the server says were implicitly answered.
        if (data.questionsRemoved && data.questionsRemoved.length > 0) {
          setAnsweredIds((prev) => {
            const next = new Set(prev)
            for (const id of data.questionsRemoved!) next.add(id)
            return next
          })
        }

        switch (data.status) {
          case "tier1_updated":
            returnToBoard("tier1")
            break

          case "gap_analysis_complete": {
            // Brief loading beat so the nurse sees "Analyzing your report…"
            setActiveQuestion(null)
            setPhase("gap_analysis")
            const next = (data.tier2Questions ?? []).map(toActiveQuestion)
            setTimeout(() => {
              setTier2Questions(next)
              setPhase("tier2_board")
            }, 1500)
            break
          }

          case "tier2_updated": {
            const remaining = (data.remainingQuestions ?? []).map(toActiveQuestion)
            setTier2Questions(remaining)
            returnToBoard("tier2")
            break
          }

          case "closing_ready": {
            const closing = (data.closingQuestions ?? []).map(toActiveQuestion)
            setClosingQuestions(closing)
            setActiveQuestion(null)
            setPhase("closing")
            break
          }

          case "closing_updated":
            setActiveQuestion(null)
            setPhase(data.allClosingComplete ? "signoff" : "closing")
            break

          default:
            returnToBoard(question.tier)
        }
      } catch (e) {
        console.error("[report] submit answer failed:", e)
        toast.error(e instanceof Error ? e.message : "Could not submit answer.")
        returnToBoard(question.tier)
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentQuestionStartMs, returnToBoard, sessionId],
  )

  const handleDeferAll = useCallback(async () => {
    if (!sessionId) {
      router.push("/staff/dashboard")
      return
    }
    setIsSubmitting(true)
    try {
      await fetch("/api/report/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: "__DEFER_ALL__",
          transcript: "",
          tier: "tier2",
        }),
      })
      router.push("/staff/dashboard")
    } catch (e) {
      console.error("[report] defer-all failed:", e)
      toast.error("Could not defer your follow-up questions. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [router, sessionId])

  const handleSignOff = useCallback(
    async (editedSections?: Partial<Record<string, string>>) => {
      if (!sessionId) {
        toast.error("No active session to sign off.")
        return
      }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/report/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            editedSections,
            signature: {
              declaration:
                "I confirm this report reflects my observations and actions.",
              signedAt: new Date().toISOString(),
            },
          }),
        })

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error || "Failed to complete report")
        }

        const data = (await res.json()) as {
          incidentId?: string
          reportCard?: ReportCardData
        }

        if (data.incidentId) setIncidentId(data.incidentId)
        if (data.reportCard) setReportCardData(data.reportCard)
        setPhase("reportcard")
      } catch (e) {
        console.error("[report] sign-off failed:", e)
        toast.error(e instanceof Error ? e.message : "Could not complete report.")
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
    const fullName = [selectedResident.firstName, selectedResident.lastName]
      .filter(Boolean)
      .join(" ")
    const room = selectedResident.roomNumber
    const now = new Date()

    setIsCreating(true)
    try {
      const res = await fetch("/api/report/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentType: selectedTypeKey,
          residentId: selectedResident.id,
          residentName: fullName,
          residentRoom: room,
          location: room ? `Room ${room}` : "Unknown",
          incidentDate: now.toISOString().split("T")[0],
          incidentTime: now.toTimeString().slice(0, 5),
          hasInjury: null,
          witnessesPresent: null,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || "Failed to start report")
      }

      const data = (await res.json()) as {
        sessionId: string
        incidentId: string
        tier1Questions: ApiQuestion[]
        completenessScore?: number
      }

      setSessionId(data.sessionId)
      setIncidentId(data.incidentId)
      setTier1Questions(data.tier1Questions.map(toActiveQuestion))
      setCompletionPercent(data.completenessScore ?? 0)
      setAnsweredIds(new Set())
      setAnswers({})
      setPhase("tier1_board")
    } catch (e) {
      console.error("[report] start failed:", e)
      toast.error(e instanceof Error ? e.message : "Could not create incident.")
    } finally {
      setIsCreating(false)
    }
  }, [name, role, userId, selectedTypeKey, selectedResident])

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

      case "tier1_board": {
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
      }

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
          onDefer: activeQuestion.allowDefer ? () => void handleDeferAll() : undefined,
          onBack: () => returnToBoard(activeQuestion.tier),
        }
        return <VoiceInputScreen {...vi} />
      }

      case "gap_analysis":
        return (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-primary">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="mt-1 flex justify-center text-foreground">
              <WaikLogo size="md" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing your report…</p>
          </div>
        )

      case "tier2_board": {
        return (
          <QuestionBoard
            title="Follow-up Questions"
            questions={tier2Questions}
            answeredIds={answeredIds}
            answers={answers}
            completenessScore={completionPercent}
            onQuestionTap={openQuestion}
            onDeferAll={() => void handleDeferAll()}
            isSubmitting={isSubmitting}
          />
        )
      }

      case "closing": {
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
      }

      case "signoff":
        return (
          <div className="p-4 sm:p-8">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="font-semibold text-foreground">Sign-Off</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review and sign off your report. (Editable clinical record UI is a later task.)
                </p>
                <Button
                  type="button"
                  className="mt-6 min-h-12 w-full min-w-[12rem] sm:w-auto"
                  onClick={() => void handleSignOff()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing off…
                    </span>
                  ) : (
                    "Sign off and complete"
                  )}
                </Button>
              </WaikCardContent>
            </WaikCard>
          </div>
        )

      case "reportcard":
        return (
          <div className="p-4 sm:p-8">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="font-semibold text-foreground">Report Card</p>
                {reportCardData ? (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-3xl font-bold text-[#0D7377]">
                      {reportCardData.completenessScore}%
                    </p>
                    <p className="text-muted-foreground">
                      Facility avg: {reportCardData.facilityAverage}% · You:{" "}
                      {reportCardData.personalAverage}%
                    </p>
                    <p className="text-muted-foreground">
                      Streak: {reportCardData.currentStreak} ·{" "}
                      {reportCardData.totalQuestionsAsked} questions ·{" "}
                      {reportCardData.dataPointsCaptured} data points
                    </p>
                    {reportCardData.coachingTips.length > 0 && (
                      <ul className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
                        {reportCardData.coachingTips.map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Score and coaching — to be connected to live data (task-05+).
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  {incidentId ? `Incident: ${incidentId}` : ""}
                </p>
                <Button
                  type="button"
                  className="mt-6 min-h-12 w-full min-w-[12rem] shadow-xl shadow-primary/30 sm:w-auto"
                  onClick={handleFinishDashboard}
                >
                  Finish and return to dashboard
                </Button>
              </WaikCardContent>
            </WaikCard>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <ErrorBoundary onReset={resetToSplash}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        {renderPhase()}
      </div>
    </ErrorBoundary>
  )
}
