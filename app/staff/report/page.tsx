"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import VoiceInputScreen, { type VoiceInputScreenProps } from "@/components/voice-input-screen"
import { WaikLogo } from "@/components/waik-logo"
import { brand } from "@/lib/design-tokens"
import { useWaikUser } from "@/hooks/use-waik-user"
import { postIncidentOrQueue } from "@/lib/offline-queue"

// --- State machine (task-03e) — props for VoiceInputScreen are fixed in task-03d. ---

export type ReportPhase =
  | "splash"
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
}> = [
  { key: "fall", title: "Fall Incident", description: "A fall, slip, or transfer-related event." },
  { key: "medication", title: "Medication Error", description: "Mar, late dose, or wrong med route." },
  { key: "conflict", title: "Resident Conflict", description: "Behavioral or social incident." },
  { key: "wound", title: "Wound or Injury", description: "New skin or tissue injury or worsening." },
]

function completionFromAnswers(answers: Record<string, string>): number {
  const n = Object.entries(answers).filter(([, v]) => v && v !== "__DEFERRED__").length
  return Math.min(100, n * 18)
}

function SplashScreen({
  onStart,
  disabled,
}: {
  onStart: (typeKey: string) => Promise<void>
  disabled: boolean
}) {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-1 text-2xl font-semibold" style={{ color: brand.darkTeal }}>
        New incident report
      </h1>
      <p className="mb-6 text-sm" style={{ color: brand.muted }}>
        Select an incident type to begin.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INCIDENT_TYPE_PRESETS.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={disabled}
            onClick={() => onStart(t.key)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#0D7377]/50 disabled:opacity-50"
          >
            <p className="font-semibold" style={{ color: brand.darkTeal }}>
              {t.title}
            </p>
            <p className="mt-1 text-sm" style={{ color: brand.muted }}>
              {t.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StaffReportPage() {
  const router = useRouter()
  const { userId, name, role } = useWaikUser()

  const [phase, setPhase] = useState<ReportPhase>("splash")
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
    setPhase("splash")
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

  const handleSplashStart = useCallback(
    async (typeKey: string) => {
      if (!userId) {
        toast.error("Sign in to create a report.")
        return
      }
      setIsCreating(true)
      try {
        const preset = INCIDENT_TYPE_PRESETS.find((p) => p.key === typeKey) ?? INCIDENT_TYPE_PRESETS[0]!
        const payload = {
          title: `${preset.title} — draft`,
          description: `${preset.description} (draft — details to follow).`,
          residentName: "Resident (pending)",
          residentRoom: "TBD",
          staffId: userId,
          staffName: name ?? "Staff",
          reportedByRole: role ?? "staff",
          priority: "medium" as const,
        }
        const result = await postIncidentOrQueue(payload)
        if (result.ok === true) {
          const incident = (await result.response.json()) as { id: string }
          setIncidentId(incident.id)
          setSessionId(null)
          setPhase("tier1_board")
          return
        }
        if (result.queued) {
          toast.success("Saved offline. Your report will send when you reconnect.", {
            duration: 5_000,
          })
          setIncidentId(null)
          setSessionId(null)
          setPhase("tier1_board")
          return
        }
        toast.error(result.error ?? "Could not create incident.")
      } catch (e) {
        console.error(e)
        toast.error("Something went wrong. Try again.")
      } finally {
        setIsCreating(false)
      }
    },
    [name, role, userId],
  )

  const handleFinishDashboard = useCallback(() => {
    const destination = role === "admin" ? "/admin/dashboard" : "/staff/dashboard"
    router.push(destination)
  }, [role, router])

  function renderPhase() {
    switch (phase) {
      case "splash":
        return <SplashScreen onStart={handleSplashStart} disabled={isCreating} />

      case "tier1_board": {
        return (
          <div className="p-4">
            <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="mb-2 font-semibold" style={{ color: brand.darkTeal }}>
                Tier 1 Question Board
              </p>
              <p className="mb-1 text-sm text-[#5A7070]">Question board UI renders here (task-04b)</p>
              <p className="mb-4 text-xs text-[#5A7070]">
                {incidentId ? `Incident: ${incidentId}` : ""}
                {sessionId ? ` · Session: ${sessionId}` : ""}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={() => openQuestion(TIER1_SAMPLE)}
                  className="rounded-xl bg-[#0D7377] px-6 text-white"
                >
                  Answer first question
                </Button>
                <Button type="button" variant="outline" onClick={() => setPhase("gap_analysis")}>
                  All Tier 1 answered (next step)
                </Button>
              </div>
            </div>
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
          <div
            className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4"
            style={{ color: brand.darkTeal }}
          >
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: brand.teal }} />
            <div className="mt-1 flex justify-center">
              <WaikLogo size="md" />
            </div>
            <p className="text-sm" style={{ color: brand.muted }}>
              Analyzing your report…
            </p>
          </div>
        )

      case "tier2_board":
        return (
          <div className="p-4">
            <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="mb-2 font-semibold" style={{ color: brand.darkTeal }}>
                Tier 2 Question Board
              </p>
              <p className="mb-4 text-sm text-[#5A7070]">Gap-fill questions — task-04b</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={() => openQuestion(TIER2_SAMPLE)}
                  className="rounded-xl bg-[#0D7377] px-6 text-white"
                >
                  Answer next question
                </Button>
                <Button type="button" variant="outline" onClick={() => setPhase("closing")}>
                  Met threshold (next: closing)
                </Button>
              </div>
            </div>
          </div>
        )

      case "closing":
        return (
          <div className="p-4">
            <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="mb-2 font-semibold" style={{ color: brand.darkTeal }}>
                Closing Questions
              </p>
              <p className="mb-4 text-sm text-[#5A7070]">Closing question board — task-04b</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={() => openQuestion(CLOSING_SAMPLE)}
                  className="rounded-xl bg-[#0D7377] px-6 text-white"
                >
                  Answer closing question
                </Button>
                <Button type="button" variant="outline" onClick={() => setPhase("signoff")}>
                  All 3 closing answered (dev)
                </Button>
              </div>
            </div>
          </div>
        )

      case "signoff":
        return (
          <div className="p-8 text-center">
            <p className="font-semibold" style={{ color: brand.darkTeal }}>
              Sign-Off
            </p>
            <p className="mt-2 text-sm text-[#5A7070]">Implemented in a later task.</p>
            <Button type="button" className="mt-4" onClick={() => setPhase("reportcard")}>
              Continue to report card
            </Button>
          </div>
        )

      case "reportcard":
        return (
          <div className="p-8 text-center">
            <p className="font-semibold" style={{ color: brand.darkTeal }}>
              Report Card
            </p>
            <p className="mt-2 text-sm text-[#5A7070]">Score &amp; coaching — to be connected to live data (task-05+).</p>
            <p className="mt-2 text-xs text-[#5A7070]">
              {incidentId ? `Incident: ${incidentId}` : ""} · {Object.keys(answers).length} answers in session
            </p>
            <Button type="button" className="mt-4 bg-[#0D7377] text-white" onClick={handleFinishDashboard}>
              Finish &amp; return to dashboard
            </Button>
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
      <div className="min-h-screen" style={{ background: brand.lightBg ?? brand.shellBg }}>
        {renderPhase()}
      </div>
    </ErrorBoundary>
  )
}
