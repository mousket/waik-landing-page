"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, Loader2, Mic, MicOff, RotateCcw, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/lib/auth-store"
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis"

type BrowserSpeechRecognition =
  typeof window extends { SpeechRecognition: infer T }
    ? T
    : typeof window extends { webkitSpeechRecognition: infer T }
      ? T
      : any

type MessageRole = "ai" | "nurse" | "system"

interface ConversationMessage {
  id: string
  role: MessageRole
  text: string
  timestamp: string
}

interface PendingQuestion {
  id: string
  text: string
  askedAt?: string
}

interface StartConversationResponse {
  sessionId: string
  incidentId: string
  score: number
  completenessScore: number
  feedback: string
  strengths: string[]
  gaps: string[]
  questions: PendingQuestion[]
  missingFieldLabels: string[]
  subtypeLabel?: string
}

interface AnswerConversationResponse {
  status: "pending" | "completed"
  nextQuestions: PendingQuestion[]
  score: number
  completenessScore: number
  feedback: string
  remainingMissing: string[]
  details?: {
    strengths: string[]
    gaps: string[]
  }
  breakdown: {
    completeness: number
  }
}

interface PrePrompt {
  key: "residentInfo" | "initialNarrative" | "residentState" | "environmentNotes"
  question: string
  acknowledgment: string
}

function buildPrePrompts(nurseName: string): PrePrompt[] {
  const friendlyName = nurseName || "there"
  return [
    {
      key: "residentInfo",
      question: `Hi ${friendlyName}, let's start with the basics. Who is the resident involved and what room are they in?`,
      acknowledgment: `Thanks ${friendlyName}.`,
    },
    {
      key: "initialNarrative",
      question: "Walk me through exactly what happened, step by step. Take your time.",
      acknowledgment: "Understood.",
    },
    {
      key: "residentState",
      question: "How is the resident doing right now? Include observed injuries, mood, or vitals.",
      acknowledgment: "Thank you for that update.",
    },
    {
      key: "environmentNotes",
      question: "Describe the environment. Any hazards, lighting issues, equipment positions, or floor conditions?",
      acknowledgment: "Great, that helps.",
    },
  ]
}

function extractResidentDetails(answer: string) {
  const roomMatch = answer.match(/\b(?:room|rm|unit|suite|apt|apartment|bed|wing)\s*([A-Za-z0-9-]+)/i)
  const residentRoom = roomMatch ? roomMatch[1].toUpperCase() : "UNKNOWN"

  const cleaned = answer
    .replace(/\b(?:room|rm|unit|suite|apt|apartment|bed|wing)\s*[A-Za-z0-9-]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const primarySentence = cleaned.split(/[.!?]/)[0]?.trim() ?? ""
  const withoutIntro = primarySentence.replace(/\b(this\s+is|i\s+am|name\s+is)\b/i, "").trim()
  const words = withoutIntro.split(" ").filter(Boolean)
  const residentName =
    words.length >= 2 ? words.slice(0, 3).join(" ") : withoutIntro || "Unknown Resident"

  return { residentName, residentRoom }
}

function createMessage(role: MessageRole, text: string): ConversationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    text,
    timestamp: new Date().toISOString(),
  }
}

function formatScore(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0"
  }
  const fixed = value.toFixed(1)
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
}

function buildQuickCritique(reportCard: {
  strengths: string[]
  gaps: string[]
  feedback: string
}): { strengthsSnippet: string; gapsSnippet: string; adviceSnippet: string } {
  const primaryStrength = reportCard.strengths[0]
  const primaryGap = reportCard.gaps[0]

  const strengthsSnippet = primaryStrength
    ? `You covered ${primaryStrength.toLowerCase()}.`
    : "Baseline facts captured."
  const gapsSnippet = primaryGap ? `Missing detail on ${primaryGap.toLowerCase()}.` : "No major gaps flagged."

  const sentences =
    reportCard.feedback
      ?.split(/[.!?]+/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0) ?? []

  const adviceSentence =
    sentences.find((sentence) =>
      /(next|please|try|consider|remember|ensure|aim|focus|add|include)/i.test(sentence),
    ) ||
    (primaryGap ? `Try to include ${primaryGap.toLowerCase()} next time.` : "")

  let adviceSnippet = ""
  if (adviceSentence) {
    const normalized = adviceSentence.replace(/^next[:\s-]*/i, "Next, ")
    adviceSnippet = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
  }

  return { strengthsSnippet, gapsSnippet, adviceSnippet }
}

export default function StaffReportPage() {
  const router = useRouter()
  const { userId, name, role } = useAuthStore()

  const [phase, setPhase] = useState<"intro" | "collect" | "processing" | "agent" | "completed">("intro")
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [preAnswers, setPreAnswers] = useState<Record<string, string>>({})
  const [activePromptKey, setActivePromptKey] = useState<PrePrompt["key"] | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<PendingQuestion | null>(null)
  const [remainingMissing, setRemainingMissing] = useState<string[]>([])
  const [subtypeLabel, setSubtypeLabel] = useState<string | undefined>()
  const [reportCard, setReportCard] = useState<{
    score: number
    completenessScore: number
    feedback: string
    strengths: string[]
    gaps: string[]
  } | null>(null)
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [awaitingAnswer, setAwaitingAnswer] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pendingListen, setPendingListen] = useState(false)
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    gaps: true,
    narrative: false,
  })
  const [initialNarrative, setInitialNarrative] = useState("")

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const preAnswersRef = useRef<Record<string, string>>({})
  const askedQuestionIdsRef = useRef<Set<string>>(new Set())
  const introHasRunRef = useRef(false)
  const firstName = useMemo(() => (name ? name.split(" ")[0] : "there"), [name])

  const { speak, stopSpeaking, isSpeaking, autoSpeak, setAutoSpeak, speechSupported, voicesLoaded } =
    useSpeechSynthesis()

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  const quickCritique = useMemo(() => {
    if (!reportCard) return null
    return buildQuickCritique(reportCard)
  }, [reportCard])

  const formatQuestionForConversation = useCallback(
    (questionText: string) => {
      const trimmed = questionText.trim()
      const askedCount = askedQuestionIdsRef.current.size
      const friendlyName = firstName || "there"
      const prefix = askedCount === 0 ? `First question, ${friendlyName}:` : `Next question, ${friendlyName}:`
      return `${prefix} ${trimmed}`
    },
    [firstName],
  )

  const handleFinish = useCallback(() => {
    const destination = role === "admin" ? "/admin/dashboard" : "/staff/dashboard"
    router.push(destination)
  }, [role, router])

function buildSubtypeCoachingMessage(
  subtypeLabel: string | undefined,
  nurseName: string,
  residentName: string,
): string | null {
  if (!subtypeLabel) return null
  const residentDisplay = residentName === "Unknown Resident" ? "the resident" : residentName
  const nurseDisplay = nurseName || "there"

  const templates: Record<string, string> = {
    "bed-related fall":
      `${nurseDisplay}, it sounds like ${residentDisplay} experienced a bed-related fall. Could you share the bed height, rail position, and what they were doing just before they slipped?`,
    "wheelchair fall":
      `${nurseDisplay}, I’m reading this as a wheelchair fall for ${residentDisplay}. Tell me more about the chair setup—brakes, cushions, footrests—and how they lost balance.`,
    "slip or trip":
      `${nurseDisplay}, this looks like a slip or trip for ${residentDisplay}. Please walk me through the floor condition, footwear, and anything on the ground that contributed.`,
    "lift or transfer incident":
      `${nurseDisplay}, I see ${residentDisplay} may have fallen during a lift or transfer. I’ll need more detail about the equipment and hand-off—how did they lose support from staff?`,
  }

  return templates[subtypeLabel] ?? null
}

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const prePrompts = useMemo(() => buildPrePrompts(firstName), [firstName])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not available in this browser.")
      return
    }

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes("start")) {
        toast.error("Unable to start listening. Please try again.")
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const speakAI = useCallback(
    (text: string, options?: { expectAnswer?: boolean; questionId?: string }) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setMessages((prev) => [...prev, createMessage("ai", trimmed)])
      const expectAnswer = options?.expectAnswer ?? false
      setAwaitingAnswer(expectAnswer)

      if (expectAnswer) {
        if (speechSupported && autoSpeak && voicesLoaded) {
          setPendingListen(true)
        } else {
          setPendingListen(false)
          startListening()
        }
      }

      if (speechSupported && autoSpeak && voicesLoaded) {
        stopSpeaking()
        speak(trimmed)
      }
    },
    [autoSpeak, speak, speechSupported, voicesLoaded, startListening, stopSpeaking],
  )

  const askPreQuestion = useCallback(
    (index: number) => {
      const prompt = prePrompts[index]
      if (!prompt) return
      setActivePromptKey(prompt.key)
      speakAI(prompt.question, { expectAnswer: true, questionId: `pre-${prompt.key}` })
    },
    [prePrompts, speakAI],
  )

  const deliverNextQuestion = useCallback(
    (questions: PendingQuestion[]) => {
      if (!questions || questions.length === 0) {
        return
      }

      let next = questions.find((question) => !askedQuestionIdsRef.current.has(question.id))
      if (!next) {
        return
      }

      // Emit any non-question bridge statements before asking the next real question
      while (next && !/[?]/.test(next.text.trim())) {
        askedQuestionIdsRef.current.add(next.id)
        speakAI(next.text, { expectAnswer: false })
        next = questions.find((question) => !askedQuestionIdsRef.current.has(question.id))
      }

      if (!next) {
        return
      }

      askedQuestionIdsRef.current.add(next.id)
      setCurrentQuestion(next)
      setPendingQuestions(questions)
      const conversationalQuestion = formatQuestionForConversation(next.text)
      speakAI(conversationalQuestion, { expectAnswer: true, questionId: next.id })
    },
    [formatQuestionForConversation, speakAI],
  )

  const bootstrapIncident = useCallback(async () => {
    if (!userId || !name) {
      toast.error("Your session has expired. Please log in again.")
      return
    }

    const snapshot = preAnswersRef.current
    const residentInfo = snapshot["residentInfo"] ?? ""
    const initialNarrativeAnswer = (snapshot["initialNarrative"] ?? "").trim()
    const residentState = snapshot["residentState"] ?? ""
    const environmentNotes = snapshot["environmentNotes"] ?? ""
    const { residentName, residentRoom } = extractResidentDetails(residentInfo)

    const fullNarrative =
      initialNarrativeAnswer.length >= 60
        ? initialNarrativeAnswer
        : [residentInfo, initialNarrativeAnswer].filter(Boolean).join("\n\n").trim() || residentInfo || "Details pending."

    const narrativeSections = [
      initialNarrativeAnswer && `Incident Narrative:\n${initialNarrativeAnswer}`,
      residentState && `Resident State:\n${residentState}`,
      environmentNotes && `Environment Notes:\n${environmentNotes}`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim()

    const analysisNarrative = narrativeSections || initialNarrativeAnswer || residentInfo || fullNarrative

    setInitialNarrative(narrativeSections || fullNarrative)

    const incidentPayload = {
      title: `${residentName} Incident Report`,
      narrative: fullNarrative,
      description: fullNarrative,
      residentName,
      residentRoom,
      residentState,
      environmentNotes,
      staffId: userId,
      staffName: name,
      reportedByRole: role,
      priority: "medium" as const,
    }

    setIsProcessing(true)

    try {
      const incidentResponse = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentPayload),
      })

      if (!incidentResponse.ok) {
        const payload = await incidentResponse.json().catch(() => ({}))
        console.error("[voice-report] Incident create failed", incidentResponse.status, payload, incidentPayload)
        toast.error(
          payload?.error ??
            "Incident could not be created. Please verify the resident details and try again.",
        )
        throw new Error(`Failed to create incident (${incidentResponse.status})`)
      }

      const incident = await incidentResponse.json()
      setIncidentId(incident.id)

      const startResponse = await fetch("/api/agent/report-conversational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          incidentId: incident.id,
          narrative: analysisNarrative,
          initialNarrative: analysisNarrative,
          investigatorId: "agent-waik",
          investigatorName: "WAiK Investigator",
          reporterName: firstName,
          assignedStaffIds: [userId],
        }),
      })

      if (!startResponse.ok) {
        const payload = await startResponse.json().catch(() => ({}))
        console.error("[voice-report] Investigator start failed", startResponse.status, payload)
        toast.error(
          payload?.error ??
            "We couldn't start the investigator agent right now. Please retry in a moment.",
        )
        throw new Error(`Investigator failed to start (${startResponse.status})`)
      }

      const startData: StartConversationResponse = await startResponse.json()
      setSessionId(startData.sessionId)
      setPendingQuestions(startData.questions)
      setRemainingMissing(startData.missingFieldLabels)
      setSubtypeLabel(startData.subtypeLabel)
      setPhase("agent")

      const followUpCount = startData.questions.length
      const followUpLabel = followUpCount === 1 ? "follow-up question" : "follow-up questions"
      const subtypeMessage = buildSubtypeCoachingMessage(startData.subtypeLabel, firstName, residentName)
      if (subtypeMessage) {
        speakAI(subtypeMessage, { expectAnswer: false })
      }
      const followUpMessage =
        followUpCount > 0
          ? `I have ${followUpCount} ${followUpLabel} to fill in the gaps. Let's tackle them one at a time.`
          : "I didn't surface any major gaps, but let's double-check together."
      speakAI(followUpMessage, { expectAnswer: false })

      deliverNextQuestion(startData.questions)
    } catch (error) {
      console.error("[voice-report] bootstrapIncident error:", error)
      toast.error("Something went wrong starting the investigator. Please try again.")
      speakAI("I hit a snag starting the investigator. Let's try that again in a moment.", { expectAnswer: false })
      setPhase("collect")
      askPreQuestion(0)
    } finally {
      setIsProcessing(false)
    }
  }, [userId, name, role, speakAI, firstName, deliverNextQuestion, askPreQuestion])

  const finishPreCollection = useCallback(() => {
    setPhase("processing")
    setActivePromptKey(null)
    speakAI("Great, let me review what you've shared and prepare follow-up questions.", { expectAnswer: false })
    bootstrapIncident()
  }, [bootstrapIncident, speakAI])

  const handlePreResponse = useCallback(
    (promptKey: PrePrompt["key"], answer: string) => {
      const trimmedAnswer = answer.trim()

      const nextAnswers = { ...preAnswersRef.current, [promptKey]: trimmedAnswer }

      if (
        promptKey === "residentInfo" &&
        trimmedAnswer.length > 120 &&
        (!nextAnswers.initialNarrative || nextAnswers.initialNarrative.length < 60)
      ) {
        nextAnswers.initialNarrative = trimmedAnswer
      }

      if (
        promptKey === "initialNarrative" &&
        trimmedAnswer.length < 60 &&
        (preAnswersRef.current.residentInfo?.length ?? 0) > 20
      ) {
        nextAnswers.initialNarrative = `${preAnswersRef.current.residentInfo}\n\n${trimmedAnswer}`.trim()
      }

      preAnswersRef.current = nextAnswers
      setPreAnswers(nextAnswers)

      const promptIndex = prePrompts.findIndex((prompt) => prompt.key === promptKey)
      const nextIndex = promptIndex + 1
      const defaultAcknowledgment = prePrompts[promptIndex]?.acknowledgment

      if (promptKey === "initialNarrative" && trimmedAnswer.length < 60) {
        speakAI("Thanks for confirming. I'll build on what you shared earlier.", { expectAnswer: false })
      } else if (defaultAcknowledgment) {
        speakAI(defaultAcknowledgment, { expectAnswer: false })
      }

      if (nextIndex < prePrompts.length) {
        askPreQuestion(nextIndex)
      } else {
        finishPreCollection()
      }
    },
    [prePrompts, speakAI, askPreQuestion, finishPreCollection],
  )

  const submitAgentAnswer = useCallback(
    async (answer: string) => {
      if (!sessionId || !currentQuestion || !userId || !name) {
        toast.error("We lost track of the conversation. Please restart.")
        return
      }

      setIsProcessing(true)

      try {
        const response = await fetch("/api/agent/report-conversational", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "answer",
            sessionId,
            questionId: currentQuestion.id,
            answerText: answer,
            answeredBy: userId,
            answeredByName: name,
            method: "voice",
            assignedStaffIds: [userId],
          }),
        })

        if (!response.ok) {
          throw new Error(`Investigator answer failed (${response.status})`)
        }

        const data: AnswerConversationResponse = await response.json()
        setRemainingMissing(data.remainingMissing)
        setPendingQuestions(data.nextQuestions)

        if (data.status === "completed") {
          setReportCard({
            score: data.score,
            completenessScore: data.completenessScore,
            feedback: data.feedback,
            strengths: data.details?.strengths ?? [],
            gaps: data.details?.gaps ?? data.remainingMissing ?? [],
          })
          setShowDetailedReport(false)
          setExpandedSections({
            strengths: true,
            gaps: true,
            narrative: false,
          })
          setPhase("completed")
          setAwaitingAnswer(false)
          const scoreLabel = formatScore(data.score)
          speakAI(
            `The report is complete. Your initial narrative scored ${scoreLabel} out of 10. ${data.feedback}`,
            { expectAnswer: false },
          )
        } else {
          deliverNextQuestion(data.nextQuestions)
        }
      } catch (error) {
        console.error("[voice-report] submitAgentAnswer error:", error)
        toast.error("I couldn't save that answer. Let's repeat it.")
        setAwaitingAnswer(true)
        speakAI("I ran into an issue saving that. Could you repeat your last answer?", {
          expectAnswer: true,
          questionId: currentQuestion.id,
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [sessionId, currentQuestion, userId, name, speakAI, deliverNextQuestion, firstName],
  )

  const handleTranscript = useCallback(
    (transcript: string) => {
      const clean = transcript.trim()
      if (!clean) {
        speakAI("I didn't catch that. Could you say it again?", {
          expectAnswer: true,
          questionId: currentQuestion?.id ?? activePromptKey ?? undefined,
        })
        return
      }

      setMessages((prev) => [...prev, createMessage("nurse", clean)])
      setAwaitingAnswer(false)

      if (phase === "collect" && activePromptKey) {
        handlePreResponse(activePromptKey, clean)
      } else if (phase === "agent" && currentQuestion) {
        submitAgentAnswer(clean)
      } else {
        speakAI("Thanks for sharing that. I'll keep it in mind.", { expectAnswer: false })
      }
    },
    [phase, activePromptKey, currentQuestion, handlePreResponse, submitAgentAnswer, speakAI],
  )

  const resetConversation = useCallback(() => {
    stopSpeaking()
    stopListening()
    askedQuestionIdsRef.current = new Set()
    introHasRunRef.current = false

    setPhase("intro")
    setMessages([])
    setPreAnswers({})
    preAnswersRef.current = {}
    setActivePromptKey(null)
    setPendingQuestions([])
    setCurrentQuestion(null)
    setRemainingMissing([])
    setSubtypeLabel(undefined)
    setReportCard(null)
  setShowDetailedReport(false)
  setExpandedSections({
    strengths: true,
    gaps: true,
    narrative: false,
  })
    setIncidentId(null)
    setSessionId(null)
    setIsProcessing(false)
    setAwaitingAnswer(false)
    setPendingListen(false)
    setInitialNarrative("")
  }, [stopListening, stopSpeaking])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null

    if (!SpeechRecognitionImpl) {
      toast.error("Your browser doesn't support voice capture. Please switch to Chrome or Edge.")
      return
    }

    const recognition: BrowserSpeechRecognition = new SpeechRecognitionImpl()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      handleTranscript(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error("[voice-report] recognition error:", event.error)
      setIsListening(false)
      if (event.error === "no-speech") {
        if (awaitingAnswer) {
          speakAI("I didn't hear anything. Let's try that one more time.", {
            expectAnswer: true,
            questionId: currentQuestion?.id ?? activePromptKey ?? undefined,
          })
          setPendingListen(true)
        }
        return
      }

      toast.error("Voice capture error. Let's try that again.")
      if (awaitingAnswer) {
        speakAI("I didn't hear anything. Could you repeat that?", {
          expectAnswer: true,
          questionId: currentQuestion?.id ?? activePromptKey ?? undefined,
        })
        setPendingListen(true)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [awaitingAnswer, handleTranscript, speakAI, activePromptKey, currentQuestion])

  useEffect(() => {
    if (!awaitingAnswer) return

    if (pendingListen && !isSpeaking) {
      startListening()
      setPendingListen(false)
    }

    if (pendingListen && (!autoSpeak || !speechSupported || !voicesLoaded)) {
      startListening()
      setPendingListen(false)
    }
  }, [awaitingAnswer, pendingListen, isSpeaking, startListening, autoSpeak, speechSupported, voicesLoaded])

  useEffect(() => {
    if (introHasRunRef.current) return
    if (!speechSupported || !voicesLoaded) return

    introHasRunRef.current = true
    setMessages([createMessage("system", "WAiK Investigator connected.")])
    setPhase("collect")

    askPreQuestion(0)
  }, [speechSupported, voicesLoaded, speakAI, askPreQuestion, firstName])

  const toggleVoice = () => {
    if (!speechSupported) {
      toast.error("Speech synthesis is not available in this browser.")
      return
    }
    setAutoSpeak(!autoSpeak)
  }

  const handleManualRepeat = () => {
    if (phase === "agent" && currentQuestion) {
      speakAI(currentQuestion.text, { expectAnswer: true, questionId: currentQuestion.id })
    } else if (phase === "collect" && activePromptKey) {
      const prompt = prePrompts.find((item) => item.key === activePromptKey)
      if (prompt) {
        speakAI(prompt.question, { expectAnswer: true, questionId: `pre-${prompt.key}` })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Live Voice Investigator</h1>
            <p className="text-muted-foreground">
              Answer conversationally and I’ll log every detail for leadership.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleVoice}>
              {autoSpeak ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" /> Voice On
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" /> Voice Muted
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleManualRepeat}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Repeat Prompt
            </Button>
            <Button variant="ghost" size="sm" onClick={resetConversation}>
              Restart
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Conversation</CardTitle>
              <p className="text-sm text-muted-foreground">WAiK records everything in real-time.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant={isListening ? "default" : "outline"}
                className={`flex items-center gap-1 px-3 py-1 ${
                  isListening ? "border-green-300 bg-green-100 text-green-700" : ""
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                {isListening ? "Listening" : "Tap to respond"}
              </Badge>
              {subtypeLabel ? <Badge variant="secondary">Detected: {subtypeLabel}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[420px] w-full overflow-y-auto rounded-lg border border-dashed p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Waiting for the conversation to begin…</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[80%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                        message.role === "ai"
                          ? "self-start bg-primary text-primary-foreground"
                          : message.role === "nurse"
                            ? "self-end bg-secondary text-secondary-foreground"
                            : "self-center bg-muted text-muted-foreground"
                      }`}
                    >
                      {message.text}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  variant={isListening ? "destructive" : "default"}
                  onClick={() => {
                    if (isListening) {
                      stopListening()
                    } else {
                      setAwaitingAnswer(true)
                      startListening()
                    }
                  }}
                >
                  {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <div>
                  <p className="text-sm font-medium">
                    {awaitingAnswer ? "I'm ready when you are." : "Tap to speak when you're ready."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {phase === "completed"
                      ? "Session complete. Review the report card below."
                      : "Hold the device close and speak in a clear voice."}
                  </p>
                </div>
              </div>

              {isProcessing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing your response…
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {reportCard ? (
          <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-lg">
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Report Complete</p>
                <div className="text-4xl font-bold text-emerald-600">{formatScore(reportCard.score)}/10</div>
                <p className="text-sm text-muted-foreground">
                  Completeness {formatScore(reportCard.completenessScore)}/10
                </p>
              </div>

              {quickCritique ? (
                <div className="rounded-md bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                  <p>
                    <span className="font-semibold text-emerald-700">What went well:</span>{" "}
                    {quickCritique.strengthsSnippet}
                  </p>
                  <p>
                    <span className="font-semibold text-amber-700">Needs attention:</span>{" "}
                    {quickCritique.gapsSnippet}
                  </p>
                  {quickCritique.adviceSnippet ? (
                    <p>
                      <span className="font-semibold text-sky-700">Advice:</span> {quickCritique.adviceSnippet}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full border-white bg-white/80 text-sm font-semibold shadow-sm hover:bg-white"
                  onClick={() =>
                    setShowDetailedReport((prev) => {
                      const next = !prev
                      if (next) {
                        setExpandedSections({
                          strengths: true,
                          gaps: true,
                          narrative: false,
                        })
                      }
                      return next
                    })
                  }
                >
                  {showDetailedReport ? "Hide Detailed Report Card" : "Show Detailed Report Card"}
                </Button>
                <Button
                  className="w-full bg-teal-500 text-white hover:bg-teal-500/90"
                  onClick={handleFinish}
                >
                  Finish & Return to Dashboard
                </Button>
              </div>

              {showDetailedReport ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/70 bg-white/80 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-emerald-700"
                      onClick={() => toggleSection("strengths")}
                    >
                      <span>What You Did Well</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.strengths ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expandedSections.strengths ? (
                      <div className="border-t border-white/70 px-4 py-3 text-sm text-slate-700">
                        {reportCard.strengths.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {reportCard.strengths.map((item) => (
                              <li key={`strength-${item}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">We’ll highlight strengths once more details are added.</p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-white/70 bg-white/80 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-amber-700"
                      onClick={() => toggleSection("gaps")}
                    >
                      <span>What Needs Work</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.gaps ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expandedSections.gaps ? (
                      <div className="border-t border-white/70 px-4 py-3 text-sm text-slate-700">
                        {reportCard.gaps.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {reportCard.gaps.map((item) => (
                              <li key={`gap-${item}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">
                            No major gaps identified—keep this level of detail next time.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-white/70 bg-white/80 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-sky-700"
                      onClick={() => toggleSection("narrative")}
                    >
                      <span>See Original Narrative</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.narrative ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expandedSections.narrative ? (
                      <div className="border-t border-white/70 px-4 py-3 text-sm text-slate-700 whitespace-pre-line">
                        {initialNarrative.trim().length > 0
                          ? initialNarrative
                          : "No initial narrative captured for this session."}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Incident ID: {incidentId}</span>
                {subtypeLabel ? <span>Subtype: {subtypeLabel}</span> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

