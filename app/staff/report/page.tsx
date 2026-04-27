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
import { postIncidentOrQueue } from "@/lib/offline-queue"
import { StaffResidentSearch, type StaffResidentSearchOption } from "@/components/staff/resident-search"
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
}

const TIER1_SAMPLE: ActiveQuestion = {
  id: "q1",
  text: "Tell us what happened.",
  label: "Q1",
  tier: "tier1",
  allowDefer: false,
}

const TIER2_SAMPLE: ActiveQuestion = {
  id: "t2-q1",
  text: "Describe the lighting conditions.",
  label: "Tier 2",
  areaHint: "Environment",
  tier: "tier2",
  allowDefer: true,
}

const CLOSING_SAMPLE: ActiveQuestion = {
  id: "c1",
  text: "What immediate interventions did you put in place?",
  label: "Closing",
  tier: "closing",
  allowDefer: false,
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
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [completionPercent, setCompletionPercent] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setCompletionPercent(completionFromAnswers(answers))
  }, [answers])

  const resetToSplash = useCallback(() => {
    setPhase("type_select")
    setSelectedTypeKey(null)
    setSelectedResident(null)
    setActiveQuestion(null)
    setAnswers({})
    setIncidentId(null)
    setSessionId(null)
    setCompletionPercent(0)
  }, [])

  const openQuestion = useCallback((q: ActiveQuestion) => {
    setActiveQuestion(q)
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
    (question: ActiveQuestion, transcript: string) => {
      setAnswers((prev) => ({ ...prev, [question.id]: transcript.trim() }))
      returnToBoard(question.tier)
    },
    [returnToBoard],
  )

  const handleDefer = useCallback(
    (question: ActiveQuestion) => {
      setAnswers((prev) => ({ ...prev, [question.id]: "__DEFERRED__" }))
      setActiveQuestion(null)
      setPhase("tier2_board")
    },
    [],
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
    const preset = INCIDENT_TYPE_PRESETS.find((p) => p.key === selectedTypeKey) ?? INCIDENT_TYPE_PRESETS[0]!
    const fullName = [selectedResident.firstName, selectedResident.lastName].filter(Boolean).join(" ")
    setIsCreating(true)
    try {
      const payload = {
        title: `${preset.title} — draft`,
        description: `${preset.description} (draft — details to follow).`,
        residentId: selectedResident.id,
        residentName: fullName,
        residentRoom: selectedResident.roomNumber,
        staffId: userId,
        staffName: name ?? "Staff",
        reportedByRole: role ?? "staff",
        priority: "medium" as const,
      }
      const result = await postIncidentOrQueue(payload)
      if (result.ok) {
        const incident = (await result.response.json()) as { id: string }
        setIncidentId(incident.id)
        setSessionId(null)
        setPhase("tier1_board")
        return
      }
      if ("queued" in result && result.queued) {
        toast.success("Saved offline. Your report will send when you reconnect.", {
          duration: 5_000,
        })
        setIncidentId(null)
        setSessionId(null)
        setPhase("tier1_board")
        return
      }
      toast.error("error" in result ? result.error : "Could not create incident.")
    } catch (e) {
      console.error(e)
      toast.error("Something went wrong. Try again.")
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
          <div className="p-4">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="mb-2 font-semibold text-foreground">Tier 1 Question Board</p>
                <p className="mb-1 text-sm text-muted-foreground">Question board UI renders here (task-04b)</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {incidentId ? `Incident: ${incidentId}` : ""}
                  {sessionId ? ` · Session: ${sessionId}` : ""}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    type="button"
                    onClick={() => openQuestion(TIER1_SAMPLE)}
                    className="min-h-12 rounded-xl px-6 shadow-xl shadow-primary/30"
                  >
                    Answer first question
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 rounded-xl"
                    onClick={() => setPhase("gap_analysis")}
                  >
                    All Tier 1 answered (next step)
                  </Button>
                </div>
              </WaikCardContent>
            </WaikCard>
          </div>
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
          onSubmit: (transcript) => handleAnswer(activeQuestion, transcript),
          onDefer: activeQuestion.allowDefer ? () => handleDefer(activeQuestion) : undefined,
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

      case "tier2_board":
        return (
          <div className="p-4">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="mb-2 font-semibold text-foreground">Tier 2 Question Board</p>
                <p className="mb-4 text-sm text-muted-foreground">Gap-fill questions — task-04b</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    type="button"
                    onClick={() => openQuestion(TIER2_SAMPLE)}
                    className="min-h-12 rounded-xl px-6 shadow-xl shadow-primary/30"
                  >
                    Answer next question
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 rounded-xl"
                    onClick={() => setPhase("closing")}
                  >
                    Met threshold (next: closing)
                  </Button>
                </div>
              </WaikCardContent>
            </WaikCard>
          </div>
        )

      case "closing":
        return (
          <div className="p-4">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="mb-2 font-semibold text-foreground">Closing Questions</p>
                <p className="mb-4 text-sm text-muted-foreground">Closing question board — task-04b</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    type="button"
                    onClick={() => openQuestion(CLOSING_SAMPLE)}
                    className="min-h-12 rounded-xl px-6 shadow-xl shadow-primary/30"
                  >
                    Answer closing question
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 rounded-xl"
                    onClick={() => setPhase("signoff")}
                  >
                    All 3 closing answered (dev)
                  </Button>
                </div>
              </WaikCardContent>
            </WaikCard>
          </div>
        )

      case "signoff":
        return (
          <div className="p-4 sm:p-8">
            <WaikCard className="mx-auto max-w-lg">
              <WaikCardContent className="text-center">
                <p className="font-semibold text-foreground">Sign-Off</p>
                <p className="mt-2 text-sm text-muted-foreground">Implemented in a later task.</p>
                <Button
                  type="button"
                  className="mt-6 min-h-12 w-full min-w-[12rem] sm:w-auto"
                  onClick={() => setPhase("reportcard")}
                >
                  Continue to report card
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
                <p className="mt-2 text-sm text-muted-foreground">
                  Score and coaching — to be connected to live data (task-05+).
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {incidentId ? `Incident: ${incidentId}` : ""} · {Object.keys(answers).length} answers in
                  session
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

  // Simulated gap analysis: auto-advance to Tier 2 board after a short delay
  useEffect(() => {
    if (phase !== "gap_analysis") {
      return
    }
    const t = setTimeout(() => setPhase("tier2_board"), 2000)
    return () => clearTimeout(t)
  }, [phase])

  return (
    <ErrorBoundary onReset={resetToSplash}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        {renderPhase()}
      </div>
    </ErrorBoundary>
  )
}
