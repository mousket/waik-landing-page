"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { ErrorBoundary } from "@/components/error-boundary"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import VoiceInputScreen, { type VoiceInputScreenProps } from "@/components/voice-input-screen"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { useWaikUser } from "@/hooks/use-waik-user"
import { cn } from "@/lib/utils"

type Phase = "loading" | "voice" | "done" | "error" | "missing"

type Q = { id: string; text: string }

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) {
    return "—"
  }
  if (typeof v === "boolean") {
    return v ? "Yes" : "No"
  }
  if (typeof v === "string" && v.trim() === "") {
    return "—"
  }
  if (typeof v === "object") {
    return JSON.stringify(v, null, 0)
  }
  return String(v)
}

export default function StaffAssessmentByTypePage() {
  const params = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const { isLoaded, isSignedIn, userId, name, role, mustChangePassword } = useWaikUser()

  const typeRaw = typeof params.type === "string" ? params.type : ""
  const assessmentType =
    typeRaw === "activity" || typeRaw === "dietary" ? (typeRaw as "activity" | "dietary") : null

  const residentId = sp.get("residentId")?.trim() ?? ""
  const residentName = sp.get("residentName")?.trim() || "Resident"
  const residentRoom = sp.get("residentRoom")?.trim() || "TBD"

  const [phase, setPhase] = useState<Phase>("loading")
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<Q | null>(null)
  const [completion, setCompletion] = useState(0)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [score, setScore] = useState(0)

  const goDashboard = useCallback(() => {
    if (role === "admin") {
      router.push("/admin/dashboard")
    } else {
      router.push("/staff/dashboard")
    }
  }, [role, router])

  useEffect(() => {
    if (mustChangePassword) {
      setPhase("error")
      setErrMsg("Password change required.")
      return
    }
    if (!isLoaded) {
      return
    }
    if (!isSignedIn) {
      setPhase("error")
      setErrMsg("Sign in to continue.")
      return
    }
    if (assessmentType == null) {
      setPhase("error")
      setErrMsg("Unknown assessment type.")
      return
    }
    if (!residentId) {
      setPhase("missing")
      return
    }
    if (!userId) {
      return
    }
    const ac = new AbortController()
    setPhase("loading")
    setErrMsg(null)
    void (async () => {
      try {
        const res = await fetch("/api/agent/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: ac.signal,
          body: JSON.stringify({
            action: "start",
            residentId,
            residentName,
            residentRoom,
            assessmentType,
          }),
        })
        if (ac.signal.aborted) {
          return
        }
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          sessionId?: string
          assessmentId?: string
          questions?: Q[]
          completenessScore?: number
        }
        if (!res.ok) {
          setErrMsg(data.error || res.statusText)
          setPhase("error")
          return
        }
        if (!data.sessionId || !data.questions?.[0]) {
          setErrMsg("Invalid start response")
          setPhase("error")
          return
        }
        setSessionId(data.sessionId)
        setAssessmentId(data.assessmentId ?? null)
        setActiveQuestion(data.questions[0] ?? null)
        setCompletion(data.completenessScore ?? 0)
        setPhase("voice")
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return
        }
        console.error(e)
        if (!ac.signal.aborted) {
          setErrMsg("Could not start assessment.")
          setPhase("error")
        }
      }
    })()
    return () => ac.abort()
  }, [isLoaded, isSignedIn, userId, assessmentType, residentId, residentName, residentRoom, mustChangePassword])

  const onAnswer = useCallback(
    async (transcript: string) => {
      if (!sessionId || !activeQuestion) {
        return
      }
      setPhase("loading")
      try {
        const res = await fetch("/api/agent/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "answer",
            sessionId,
            questionId: activeQuestion.id,
            answerText: transcript,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          status?: "pending" | "completed"
          nextQuestions?: Q[]
          completenessScore?: number
          structuredOutput?: Record<string, unknown>
        }
        if (!res.ok) {
          toast.error(data.error || "Could not save answer.")
          setPhase("voice")
          return
        }
        setCompletion(data.completenessScore ?? 0)
        if (data.status === "completed") {
          setSummary(data.structuredOutput ?? {})
          setScore(data.completenessScore ?? 0)
          setPhase("done")
          return
        }
        const nq = data.nextQuestions?.[0]
        if (nq) {
          setActiveQuestion(nq)
          setPhase("voice")
        } else {
          toast.error("No next question returned.")
          setPhase("voice")
        }
      } catch (e) {
        console.error(e)
        toast.error("Network error")
        setPhase("voice")
      }
    },
    [activeQuestion, sessionId],
  )

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (assessmentType == null) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">This assessment type is not supported yet.</p>
        <Button type="button" className="mt-4" variant="outline" onClick={goDashboard}>
          Back
        </Button>
      </div>
    )
  }

  if (phase === "missing" || (phase === "loading" && !residentId)) {
    return (
      <div className="p-6">
        <PageHeader
          className="mb-4"
          title="Resident required"
          description="Open this page from a due assessment, or add ?residentId= in the link."
        />
        <Button type="button" onClick={goDashboard}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  if (phase === "error" && errMsg) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{errMsg}</p>
        <Button type="button" className="mt-4" onClick={goDashboard}>
          Back
        </Button>
      </div>
    )
  }

  if (phase === "loading" && (sessionId == null || !activeQuestion)) {
    return (
      <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Starting assessment…</p>
      </div>
    )
  }

  if (phase === "done") {
    const raw = summary ?? {}
    const keys = Object.keys(raw).filter((k) => raw[k] != null && raw[k] !== "")
    return (
      <div className="relative flex flex-1 flex-col p-4 pb-10 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <PageHeader
          className="mb-4"
          title={assessmentType === "activity" ? "Activity assessment" : "Dietary assessment"}
          description="Completed. Review captured fields before leaving."
        />
        <WaikCard>
          <WaikCardContent className="p-4 sm:p-6">
            <p className="mb-3 text-sm font-medium text-foreground">Structured output</p>
            <p className="mb-3 text-xs text-muted-foreground">Completeness: {Math.round(score)}%</p>
            <ul className="space-y-2 text-sm">
              {keys.length === 0 ? (
                <li className="text-muted-foreground">No additional fields (check narrative in admin).</li>
              ) : (
                keys.map((k) => (
                  <li
                    key={k}
                    className={cn(
                      "flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-start sm:gap-3",
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground sm:w-44">{formatFieldLabel(k)}</span>
                    <span className="min-w-0 break-words text-foreground">{formatValue(raw[k])}</span>
                  </li>
                ))
              )}
            </ul>
            {assessmentId ? (
              <p className="mt-4 text-xs text-muted-foreground">Reference: {assessmentId}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" className="min-h-12" onClick={goDashboard}>
                Return to dashboard
              </Button>
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>
    )
  }

  if (activeQuestion) {
    const vi: VoiceInputScreenProps = {
      question: activeQuestion.text,
      questionLabel: "Assessment",
      showEncouragement: true,
      allowDefer: false,
      initialTranscript: undefined,
      completionRingPercent: completion,
      onSubmit: onAnswer,
      onBack: goDashboard,
    }
    return (
      <ErrorBoundary
        onReset={() => {
          setPhase("voice")
        }}
      >
        <div className="relative flex flex-1 flex-col">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          {phase === "loading" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div className="p-4 pb-2 sm:p-6">
            <p className="text-xs text-muted-foreground">Room {residentRoom}</p>
            <h1 className="text-base font-semibold text-foreground">
              {assessmentType === "activity" ? "Activity" : "Dietary"} — {residentName}
            </h1>
          </div>
          <VoiceInputScreen {...vi} />
        </div>
      </ErrorBoundary>
    )
  }

  return null
}
