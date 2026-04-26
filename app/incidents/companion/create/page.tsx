"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useWaikUser } from "@/hooks/use-waik-user"
import { postIncidentOrQueue } from "@/lib/offline-queue"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Volume2, VolumeX, CheckCircle2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { CompanionWaveAnimation } from "../../../../components/companion-wave-animation"

type ConversationStep = "greeting" | "narrative" | "analyzing" | "follow-up" | "report-card" | "complete"
type NarrativeKey = "resident" | "incident" | "residentState" | "environment"

const NARRATIVE_PROMPTS: Array<{ key: NarrativeKey; prompt: string }> = [
  {
    key: "resident",
    prompt:
      "First, please share the resident’s full name and room number so we can anchor the report correctly.",
  },
  {
    key: "incident",
    prompt:
      "Now walk me through everything that happened in detail. Include what led up to the fall and what you observed.",
  },
  {
    key: "residentState",
    prompt:
      "Tell me about the resident’s current state—physical condition, injuries, mood, clothing, and overall disposition.",
  },
  {
    key: "environment",
    prompt:
      "Describe the environment and circumstances around the fall. Mention hazards, lighting, equipment, or anything in the room that matters.",
  },
]

const AI_MESSAGES = {
  greeting:
    "Hello! I'm WAiK, your AI companion. We'll capture a complete fall report together—I'll ask four quick questions to build your narrative, then handle the rest.",
  analyzing: "Thank you. Let me analyze that and prepare some follow-up questions...",
  reportCard: "Your report has been created successfully. Here's your quality score.",
}

export default function CompanionCreatePage() {
  const router = useRouter()
  const { userId, role, name } = useWaikUser()
  const [currentText, setCurrentText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [currentStep, setCurrentStep] = useState<ConversationStep>("greeting")
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [reportScore, setReportScore] = useState<number | null>(null)
  const [reportFeedback, setReportFeedback] = useState<string>("")
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    gaps: true,
    narrative: false,
  })
  const [reportDetails, setReportDetails] = useState<{
    whatYouDidWell: string[]
    whatWasMissed: string[]
  } | null>(null)
  const [awaitingStart, setAwaitingStart] = useState(true)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [initialNarrative, setInitialNarrative] = useState("")

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef(false)
  const isListeningRef = useRef(false)
  const speechEndTimerRef = useRef<NodeJS.Timeout | null>(null)

  const narrativeRef = useRef("")
  const narrativeAnswersRef = useRef<Record<NarrativeKey, string>>({
    resident: "",
    incident: "",
    residentState: "",
    environment: "",
  })
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null)
  const [currentAgentQuestion, setCurrentAgentQuestion] = useState<{ id: string; text: string } | null>(null)
  const askedQuestionIdsRef = useRef<Set<string>>(new Set())
  const currentTextRef = useRef("")
  const currentStepRef = useRef<ConversationStep>("greeting")
  const currentPromptIndexRef = useRef(0)
  const awaitingSubmissionRef = useRef(false)
  const micErrorRef = useRef(false)
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [awaitingSubmission, setAwaitingSubmission] = useState(false)

  useEffect(() => {
    currentTextRef.current = currentText
  }, [currentText])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    currentPromptIndexRef.current = currentPromptIndex
  }, [currentPromptIndex])

  useEffect(() => {
    console.log("[v0] 🎤 Initializing voice systems...")

    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
      console.log("[v0] ✅ Speech synthesis available:", !!synthRef.current)
    }

    const loadVoices = () => {
      if (!synthRef.current) {
        console.log("[v0] ❌ No speech synthesis available")
        return false
      }

      const voices = synthRef.current.getVoices()
      console.log("[v0] 🔊 Available voices:", voices.length)

      if (voices.length > 0) {
        const samanthaVoice = voices.find((v) => v.name.toLowerCase().includes("samantha"))
        const defaultEnglishVoice = voices.find((v) => v.lang.startsWith("en"))
        const selectedVoice = samanthaVoice || defaultEnglishVoice || voices[0]

        console.log("[v0] ✅ Selected voice:", selectedVoice.name, selectedVoice.lang)
        setSelectedVoice(selectedVoice)
        setVoicesLoaded(true)
        return true
      }
      console.log("[v0] ⏳ Waiting for voices to load...")
      return false
    }

    if (!loadVoices()) {
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = () => {
          console.log("[v0] 🔄 Voices changed event triggered")
          loadVoices()
        }
      }
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      console.log("[v0] ✅ Speech recognition available")
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => {
        console.log("[v0] 🎤 Speech recognition STARTED")
      }

      recognitionRef.current.onresult = (event: any) => {
        console.log("[v0] 📝 Speech recognition result event")
        let finalTranscript = ""
        let interimText = ""

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
            console.log("[v0] ✅ Final transcript:", transcript)
          } else {
            interimText += transcript
            console.log("[v0] 💭 Interim transcript:", transcript)
          }
        }

        if (finalTranscript) {
          awaitingSubmissionRef.current = true
          setAwaitingSubmission(true)
          clearResumeTimer()
          if (speechEndTimerRef.current) {
            clearTimeout(speechEndTimerRef.current)
            speechEndTimerRef.current = null
          }

          setCurrentText((prev) => {
            const newText = (prev + " " + finalTranscript).trim()
            console.log("[v0] 📝 Updated current text:", newText)
            return newText
          })

          isListeningRef.current = false
          setIsListening(false)

          resumeTimerRef.current = setTimeout(() => {
            if (
              awaitingSubmissionRef.current &&
              !isListeningRef.current &&
              !micErrorRef.current &&
              currentStepRef.current !== "report-card" &&
              currentStepRef.current !== "complete"
            ) {
              console.log("[v0] 🔁 Resuming listening to capture additional details after pause")
              try {
                recognitionRef.current?.start()
                isListeningRef.current = true
                setIsListening(true)
              } catch (error) {
                console.log("[v0] ⚠️ Resume listening failed:", error)
              }
            }
            resumeTimerRef.current = null
          }, 4500)
        }

        setInterimTranscript(interimText)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("[v0] ❌ Speech recognition error:", event.error)
        isListeningRef.current = false
        setIsListening(false)
        awaitingSubmissionRef.current = false
        setAwaitingSubmission(false)
        clearResumeTimer()

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          micErrorRef.current = true
          toast.error("Microphone access is blocked. Please allow mic permissions in your browser and restart this conversation.")
          setAwaitingStart(true)
          setCurrentStep("greeting")
          currentStepRef.current = "greeting"
          setCurrentPromptIndex(0)
          currentPromptIndexRef.current = 0
          setIsProcessing(false)
          return
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          toast.error(`Speech recognition error: ${event.error}`)
        }
      }

      recognitionRef.current.onend = () => {
        console.log("[v0] 🔚 Speech recognition ended")
        isListeningRef.current = false
        setIsListening(false)

        if (micErrorRef.current) {
          console.log("[v0] 🚫 Mic error present; skipping restart")
          return
        }

        if (
          !awaitingSubmissionRef.current &&
          currentStepRef.current !== "report-card" &&
          currentStepRef.current !== "complete" &&
          currentStepRef.current !== "analyzing"
        ) {
          console.log("[v0] 🔄 Restarting speech recognition...")
          try {
            awaitingSubmissionRef.current = false
            recognitionRef.current.start()
            isListeningRef.current = true
            setIsListening(true)
          } catch (error) {
            console.log("[v0] ⚠️ Recognition restart failed:", error)
          }
        }
      }
    } else {
      console.error("[v0] ❌ Speech recognition NOT available in this browser")
      toast.error("Speech recognition is not supported in this browser. Please use Chrome or Edge.")
    }

    return () => {
      console.log("[v0] 🧹 Cleaning up voice systems...")
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      if (speechEndTimerRef.current) {
        clearTimeout(speechEndTimerRef.current)
      }
    }
  }, [])

  const speak = (text: string) => {
    console.log("[v0] 💬 speak() called with text:", text.substring(0, 50) + "...")
    console.log("[v0] 💬 autoSpeak:", autoSpeak, "voicesLoaded:", voicesLoaded, "selectedVoice:", !!selectedVoice)

    if (!autoSpeak) {
      console.log("[v0] 🔇 Auto-speak is disabled")
      return
    }

    if (!synthRef.current || !voicesLoaded || !selectedVoice) {
      console.log("[v0] ❌ Cannot speak - missing requirements")
      return
    }

    if (isListeningRef.current) {
      console.log("[v0] 🛑 Stopping listening while AI speaks")
      stopListening()
    }

    if (isSpeakingRef.current && currentUtteranceRef.current) {
      console.log("[v0] 🛑 Already speaking, canceling current utterance")
      synthRef.current.cancel()
      currentUtteranceRef.current = null
      isSpeakingRef.current = false
      setIsSpeaking(false)
      setTimeout(() => speakImmediate(text), 100)
    } else {
      speakImmediate(text)
    }
  }

  const speakImmediate = (text: string) => {
    console.log("[v0] 🗣️ speakImmediate() called")
    if (!synthRef.current || !selectedVoice) {
      console.log("[v0] ❌ Cannot speak immediately - missing requirements")
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = selectedVoice
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    currentUtteranceRef.current = utterance
    console.log("[v0] 🎙️ Created utterance with voice:", selectedVoice.name)

    utterance.onstart = () => {
      console.log("[v0] ▶️ Speech STARTED")
      isSpeakingRef.current = true
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log("[v0] ⏹️ Speech ENDED")
      isSpeakingRef.current = false
      setIsSpeaking(false)
      currentUtteranceRef.current = null

      const step = currentStepRef.current

      if (step === "greeting") {
        console.log("[v0] 📋 Greeting finished, queuing first narrative prompt")
        setTimeout(() => {
          setCurrentStep("narrative")
          currentStepRef.current = "narrative"
          setCurrentPromptIndex(0)
          currentPromptIndexRef.current = 0
          speak(NARRATIVE_PROMPTS[0].prompt)
        }, 600)
        return
      }

      if (
        !isListeningRef.current &&
        step !== "report-card" &&
        step !== "complete" &&
        step !== "analyzing"
      ) {
        const promptIdx = currentPromptIndexRef.current
        const delay =
          step === "narrative"
            ? promptIdx === 0
              ? 3200
              : 2200
            : step === "follow-up"
              ? 1500
              : 1000
        console.log("[v0] 🎤 Starting listening after speech ended in", delay, "ms")
        setTimeout(() => {
          startListening()
        }, delay)
      }
    }

    utterance.onerror = (event) => {
      console.error("[v0] ❌ Speech synthesis error:", event.error)
      isSpeakingRef.current = false
      setIsSpeaking(false)
      currentUtteranceRef.current = null
    }

    console.log("[v0] 📢 Calling speechSynthesis.speak()")
    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    console.log("[v0] 🛑 stopSpeaking() called")
    if (synthRef.current && isSpeakingRef.current) {
      synthRef.current.cancel()
      currentUtteranceRef.current = null
      isSpeakingRef.current = false
      setIsSpeaking(false)
      console.log("[v0] ✅ Speech stopped")
    }
  }

  const startListening = () => {
    console.log("[v0] 🎤 startListening() called")
    if (!recognitionRef.current) {
      console.log("[v0] ❌ No recognition ref available")
      return
    }

    if (isListeningRef.current) {
      console.log("[v0] ⚠️ Already listening")
      return
    }

    if (isSpeakingRef.current) {
      console.log("[v0] ⚠️ Cannot start listening while AI is speaking")
      return
    }

    try {
      console.log("[v0] 🔊 Starting speech recognition...")
      micErrorRef.current = false
      clearResumeTimer()
      recognitionRef.current.start()
      isListeningRef.current = true
      setIsListening(true)
      console.log("[v0] ✅ Speech recognition started")
    } catch (error) {
      console.error("[v0] ❌ Failed to start recognition:", error)
    }
  }

  const stopListening = () => {
    console.log("[v0] 🛑 stopListening() called")
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setIsListening(false)
      console.log("[v0] ✅ Listening stopped")
    }
  }

  const buildNarrativeSummary = (answers: Record<NarrativeKey, string>) => {
    const sections = [
      answers.resident.trim()
        ? `Resident & Location:\n${answers.resident.trim()}`
        : "",
      answers.incident.trim()
        ? `Incident Details:\n${answers.incident.trim()}`
        : "",
      answers.residentState.trim()
        ? `Resident Status:\n${answers.residentState.trim()}`
        : "",
      answers.environment.trim()
        ? `Environment & Contributing Factors:\n${answers.environment.trim()}`
        : "",
    ].filter(Boolean)

    return sections.join("\n\n")
  }

  const toggleSection = (section: "strengths" | "gaps" | "narrative") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleStartConversation = () => {
    console.log("[v0] 🚀 Starting conversation!")
    console.log("[v0] 🔊 Voices loaded:", voicesLoaded)

    if (!voicesLoaded) {
      toast.error("Voice system is still loading. Please wait a moment.")
      return
    }
    setReportScore(null)
    setReportFeedback("")
    setReportDetails(null)
    setShowDetailedReport(false)
    setExpandedSections({
      strengths: true,
      gaps: true,
      narrative: false,
    })
    setInitialNarrative("")
    narrativeRef.current = ""
    narrativeAnswersRef.current = {
      resident: "",
      incident: "",
      residentState: "",
      environment: "",
    }
    askedQuestionIdsRef.current = new Set()
    setCurrentPromptIndex(0)
    currentPromptIndexRef.current = 0
    setCurrentStep("greeting")
    currentStepRef.current = "greeting"
    awaitingSubmissionRef.current = false
    setAwaitingSubmission(false)
    clearResumeTimer()
    setAwaitingStart(false)
    // Prompt for microphone permission immediately on user gesture, then let WAiK speak
    startListening()
    setTimeout(() => {
      stopListening()
      console.log("[v0] 💬 Speaking greeting message...")
      speak(AI_MESSAGES.greeting)
    }, 250)
  }

  const handleSubmit = async () => {
    console.log("[v0] 📤 handleSubmit() called")

    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current)
      speechEndTimerRef.current = null
    }

    stopListening()
    const userResponse = currentText.trim()

    if (!userResponse) {
      console.log("[v0] ⚠️ No user response to submit")
      awaitingSubmissionRef.current = false
      setAwaitingSubmission(false)
      clearResumeTimer()
      if (!isListeningRef.current && currentStep !== "report-card" && currentStep !== "complete") {
        setTimeout(() => {
          if (!isListeningRef.current) {
            startListening()
          }
        }, 300)
      }
      return
    }

    awaitingSubmissionRef.current = false
    setAwaitingSubmission(false)
    clearResumeTimer()

    console.log("[v0] 📝 User response:", userResponse)
    console.log("[v0] 📍 Current step:", currentStep)

    setCurrentText("")
    setInterimTranscript("")

    if (currentStep === "greeting" || currentStep === "narrative") {
      const promptIndex = currentStep === "greeting" ? 0 : currentPromptIndex
      const promptMeta = NARRATIVE_PROMPTS[promptIndex]

      if (promptMeta) {
        narrativeAnswersRef.current[promptMeta.key] = userResponse
      }

      const nextIndex = promptIndex + 1

      if (nextIndex < NARRATIVE_PROMPTS.length) {
        setCurrentPromptIndex(nextIndex)
        currentPromptIndexRef.current = nextIndex
        setCurrentStep("narrative")
        currentStepRef.current = "narrative"
        speak(NARRATIVE_PROMPTS[nextIndex].prompt)
        return
      }

      const narrativeSummary = buildNarrativeSummary(narrativeAnswersRef.current)
      narrativeRef.current = narrativeSummary
      setInitialNarrative(narrativeSummary)
        setIsProcessing(true)
        setCurrentStep("analyzing")
      currentStepRef.current = "analyzing"
        speak(AI_MESSAGES.analyzing)

      try {
        const incidentPayload = {
          title: `${name || "Staff"} Incident Report`,
          narrative: narrativeSummary,
          description: narrativeSummary,
          residentName: "Resident",
          residentRoom: "Unknown",
          staffId: userId,
          staffName: name,
          reportedByRole: role,
        }
        const postResult = await postIncidentOrQueue(incidentPayload)

        if (!postResult.ok) {
          if ("queued" in postResult && postResult.queued) {
            setIsProcessing(false)
            toast.success("Saved offline. Your report will send when you reconnect.", {
              duration: 5_000,
            })
            setCurrentStep("greeting")
            currentStepRef.current = "greeting"
            return
          }
          throw new Error("error" in postResult ? postResult.error : "Failed to create incident.")
        }

        const incident = (await postResult.response.json()) as { id: string }

        const startResponse = await fetch("/api/agent/report-conversational", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            incidentId: incident.id,
            narrative: narrativeSummary,
            initialNarrative: narrativeSummary,
            investigatorId: "agent-companion",
            investigatorName: "WAiK Companion Investigator",
            reporterName: name || "Staff Reporter",
            assignedStaffIds: userId ? [userId] : undefined,
          }),
        })

        if (!startResponse.ok) {
          const payload = await startResponse.json().catch(() => ({}))
          throw new Error(payload?.error ?? "Failed to initialize investigator.")
        }

        let startData = (await startResponse.json()) as {
          status?: string
          sessionId?: string | null
          message?: string
          questions?: Array<{ id: string; text: string }>
          score?: number
          feedback?: string
          strengths?: string[]
          gaps?: string[]
        }

        if (startData.status === "partial") {
          await new Promise((r) => setTimeout(r, 2000))
          const retry = await fetch("/api/agent/report-conversational", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              incidentId: incident.id,
              narrative: narrativeSummary,
              initialNarrative: narrativeSummary,
              investigatorId: "agent-companion",
              investigatorName: "WAiK Companion Investigator",
              reporterName: name || "Staff Reporter",
              assignedStaffIds: userId ? [userId] : undefined,
            }),
          })
          if (retry.ok) {
            const again = (await retry.json()) as typeof startData
            if (again.status !== "partial") {
              startData = again
            }
          }
        }

        if (startData.status === "partial") {
          toast.info(
            startData.message ??
              "The investigator is taking longer than expected. Please start your answers again from the top.",
          )
          speak("That took too long. Let's go back to the beginning of this form.")
          setIsProcessing(false)
          setCurrentStep("greeting")
          currentStepRef.current = "greeting"
          setCurrentPromptIndex(0)
          currentPromptIndexRef.current = 0
          narrativeAnswersRef.current = {
            resident: "",
            incident: "",
            residentState: "",
            environment: "",
          }
          setAgentSessionId(null)
          return
        }

        if (!startData.sessionId) {
          throw new Error("Investigator did not return a session id.")
        }

        setAgentSessionId(startData.sessionId)
        const firstQuestion = startData.questions?.[0]
        if (firstQuestion) {
          askedQuestionIdsRef.current = new Set([firstQuestion.id])
          setCurrentAgentQuestion(firstQuestion)
          setCurrentStep("follow-up")
          currentStepRef.current = "follow-up"
          setIsProcessing(false)
          speak(firstQuestion.text)
        } else {
          setIsProcessing(false)
          setCurrentStep("report-card")
          currentStepRef.current = "report-card"
          setReportScore(startData.score ?? null)
          setReportFeedback(startData.feedback ?? "")
          setReportDetails({
            whatYouDidWell: startData.strengths ?? [],
            whatWasMissed: startData.gaps ?? [],
          })
          setShowDetailedReport(false)
          setExpandedSections({
            strengths: true,
            gaps: true,
            narrative: false,
          })
          speak("I didn't find any follow-up questions. Your report is ready.")
        }
      } catch (error) {
        console.error("[companion] Error starting investigator:", error)
        toast.error(error instanceof Error ? error.message : "Failed to start investigator.")
        setIsProcessing(false)
      }
      return
    }

    if (!agentSessionId || !currentAgentQuestion) {
      toast.error("We're not connected to the investigator yet. Please restart the conversation.")
      return
    }

        setIsProcessing(true)

        try {
      const answerResponse = await fetch("/api/agent/report-conversational", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
          action: "answer",
          sessionId: agentSessionId,
          questionId: currentAgentQuestion.id,
          answerText: userResponse,
          answeredBy: userId || "staff-user",
          answeredByName: name || "Staff Reporter",
          method: "voice",
            }),
          })

      if (!answerResponse.ok) {
        const payload = await answerResponse.json().catch(() => ({}))
        throw new Error(payload?.error ?? "Failed to submit answer.")
      }

      const data = await answerResponse.json()

      if (data.status === "partial") {
        toast.info(
          (data as { message?: string }).message ??
            "That took a while. I saved your progress. Please say your answer again.",
        )
        speak(
          (data as { message?: string }).message?.split("—")[0]?.trim() ??
            "That took a bit long. Please repeat your last answer.",
        )
        setIsProcessing(false)
        startListening()
        return
      }

      if (data.status === "completed") {
          setIsProcessing(false)
        askedQuestionIdsRef.current = new Set()
        setCurrentAgentQuestion(null)
        setReportScore(data.score ?? null)
        setReportFeedback(data.feedback ?? "")
        setReportDetails({
          whatYouDidWell: data.details?.strengths ?? [],
          whatWasMissed: data.details?.gaps ?? [],
        })
        setShowDetailedReport(false)
        setExpandedSections({
          strengths: true,
          gaps: true,
          narrative: false,
        })
          setCurrentStep("report-card")
        currentStepRef.current = "report-card"
        speak(`Thank you. Your report scored ${data.score ?? "a"} out of 10.`)
          setTimeout(() => {
          if (data.feedback) {
              speak(data.feedback)
          }
        }, 1500)
        return
      }

      const remaining = data.nextQuestions ?? []
      const nextQuestion = remaining.find((q: any) => !askedQuestionIdsRef.current.has(q.id)) ?? remaining[0]

      if (!nextQuestion) {
        setIsProcessing(false)
        setCurrentStep("report-card")
        currentStepRef.current = "report-card"
        askedQuestionIdsRef.current = new Set()
        setCurrentAgentQuestion(null)
        setReportScore(data.score ?? null)
        setReportFeedback(data.feedback ?? "")
        setReportDetails({
          whatYouDidWell: data.details?.strengths ?? [],
          whatWasMissed: data.details?.gaps ?? [],
        })
        setShowDetailedReport(false)
        setExpandedSections({
          strengths: true,
          gaps: true,
          narrative: false,
        })
        speak("That's everything I needed. I'll finish up your report now.")
        return
      }

      askedQuestionIdsRef.current.add(nextQuestion.id)
      setCurrentAgentQuestion(nextQuestion)
      setIsProcessing(false)
      setCurrentStep("follow-up")
      currentStepRef.current = "follow-up"
      speak(nextQuestion.text)
        } catch (error) {
      console.error("[companion] Error saving answer:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit answer.")
          setIsProcessing(false)
      startListening()
    }
  }

  const handleFinish = () => {
    console.log("[v0] 🏁 Finishing conversation")
    stopSpeaking()
    stopListening()
    clearResumeTimer()
    if (role === "admin") {
      router.push("/admin/dashboard")
    } else {
      router.push("/staff/dashboard")
    }
  }

  const getCurrentMessage = () => {
    if (currentStep === "greeting") return AI_MESSAGES.greeting
    if (currentStep === "narrative") return NARRATIVE_PROMPTS[currentPromptIndex]?.prompt ?? ""
    if (currentStep === "analyzing") return AI_MESSAGES.analyzing
    if (currentStep === "follow-up") return currentAgentQuestion?.text ?? ""
    if (currentStep === "report-card") return AI_MESSAGES.reportCard
    return ""
  }

  const safeReportDetails = reportDetails ?? {
    whatYouDidWell: [],
    whatWasMissed: [],
  }

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }

  const handleRetake = () => {
    console.log("[v0] 🔄 Retaking response")
    awaitingSubmissionRef.current = false
    setAwaitingSubmission(false)
    clearResumeTimer()

    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current)
      speechEndTimerRef.current = null
    }

    stopListening()
    setCurrentText("")
    setInterimTranscript("")
    startListening()
  }

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 lg:left-72">
      <div className="relative z-10 border-b border-border/20 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            className="min-h-12 gap-2 text-foreground -ml-2 hover:bg-muted/80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">AI companion</h1>
            <p className="hidden text-xs text-muted-foreground sm:block sm:text-sm">Voice-first reporting</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAutoSpeak(!autoSpeak)
              if (autoSpeak) {
                stopSpeaking()
              }
            }}
            className="h-12 w-12 min-h-12 min-w-12 text-foreground hover:bg-muted/80"
          >
            {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {awaitingStart ? (
        <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card/95 p-8 text-center shadow-xl backdrop-blur-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Ready to start?</h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                I'll guide you through reporting an incident using natural conversation. Just speak naturally, and I'll
                listen.
              </p>
            </div>
            <Button
              onClick={handleStartConversation}
              size="lg"
              className="h-12 min-h-12 w-full font-semibold shadow-lg shadow-primary/20"
              disabled={!voicesLoaded}
            >
              {voicesLoaded ? "Start conversation" : "Loading voice system…"}
            </Button>
            <p className="text-xs text-muted-foreground">Make sure your volume is up and you're in a quiet space.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 space-y-8">
            {currentStep !== "report-card" ? (
              <>
                <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                  <CompanionWaveAnimation isListening={isListening} isSpeaking={isSpeaking} />
                </div>

                <div className="w-full max-w-2xl rounded-3xl border border-border/50 bg-card/95 p-6 text-center shadow-lg backdrop-blur-sm">
                  <p className="text-lg leading-relaxed text-foreground sm:text-xl">{getCurrentMessage()}</p>
                </div>

                {(currentText || interimTranscript) && (
                  <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-muted/40 p-4">
                    <p className="text-sm text-foreground/90">
                      <span className="font-semibold">You:</span> {currentText}
                      <span className="italic text-muted-foreground">{interimTranscript}</span>
                    </p>
                  </div>
                )}

                {currentText.trim() && !isProcessing && (
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button
                      onClick={handleSubmit}
                      size="lg"
                      className="h-12 min-h-12 flex-1 px-8 font-semibold shadow-lg shadow-primary/20"
                    >
                      Submit response
                    </Button>
                    {awaitingSubmission ? (
                      <Button
                        onClick={handleRetake}
                        size="lg"
                        variant="outline"
                        className="h-12 min-h-12 flex-1 border-border"
                      >
                        Retake response
                      </Button>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card/95 p-8 shadow-xl backdrop-blur-sm">
                <div className="space-y-4 text-center">
                  <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500 drop-shadow-lg" />
                  <h2 className="text-3xl font-bold text-foreground">Report complete</h2>
                  <div className="text-7xl font-bold text-primary drop-shadow-sm">
                    {reportScore !== null ? reportScore : "--"}/10
                  </div>
                </div>

                <div className="space-y-5">
                  {reportFeedback ? (
                    <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                      {reportFeedback}
                    </div>
                  ) : null}

                    <Button
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
                      variant="outline"
                      className="h-12 min-h-12 w-full border-border"
                      size="lg"
                    >
                    {showDetailedReport ? "Hide detailed report" : "Show detailed report"}
                    </Button>

                  {showDetailedReport ? (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-emerald-700 dark:text-emerald-400"
                          onClick={() => toggleSection("strengths")}
                        >
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            What you did well
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedSections.strengths ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expandedSections.strengths ? (
                          <div className="border-t border-border/50 px-4 py-3 text-sm text-foreground/90">
                            {safeReportDetails.whatYouDidWell.length > 0 ? (
                          <ul className="space-y-2">
                                {safeReportDetails.whatYouDidWell.map((item, index) => (
                                  <li key={`strength-${index}`} className="flex gap-2">
                                    <span className="shrink-0 text-emerald-600">[+]</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                            ) : (
                              <p className="text-muted-foreground">
                                {reportDetails
                                  ? "We'll highlight strengths once more detail is provided."
                                  : "Detailed strengths will appear once scoring is ready."}
                              </p>
                            )}
                          </div>
                        ) : null}
                        </div>

                      <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-amber-700 dark:text-amber-400"
                          onClick={() => toggleSection("gaps")}
                        >
                          <span>What needs work</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expandedSections.gaps ? "rotate-180" : ""}`}
                          />
                        </button>
                        {expandedSections.gaps ? (
                          <div className="border-t border-border/50 px-4 py-3 text-sm text-foreground/90">
                            {safeReportDetails.whatWasMissed.length > 0 ? (
                          <ul className="space-y-2">
                                {safeReportDetails.whatWasMissed.map((item, index) => (
                                  <li key={`gap-${index}`} className="flex gap-2">
                                    <span className="shrink-0 text-amber-600">[!]</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                            ) : (
                              <p className="text-muted-foreground">
                                {reportDetails
                                  ? "No major gaps identified. Keep this level of detail."
                                  : "Gap analysis will display as soon as WAiK finishes scoring."}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-primary"
                          onClick={() => toggleSection("narrative")}
                        >
                          <span>See original narrative</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedSections.narrative ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expandedSections.narrative ? (
                          <div className="whitespace-pre-line border-t border-border/50 px-4 py-3 text-sm text-foreground/90">
                            {initialNarrative.trim().length > 0
                              ? initialNarrative
                              : "No initial narrative captured for this session."}
                          </div>
                        ) : null}
                      </div>
                      {!reportDetails ? (
                        <p className="text-xs text-muted-foreground">
                          Detailed scoring is still loading—sections will fill in automatically once ready.
                        </p>
                      ) : null}
                        </div>
                  ) : null}

                    <Button
                      onClick={handleFinish}
                      className="h-12 min-h-12 w-full font-semibold shadow-lg shadow-primary/20"
                      size="lg"
                    >
                      Finish & return to dashboard
                    </Button>
                  </div>
              </div>
            )}
          </div>

          <div className="relative z-10 flex justify-center pb-6">
            <div className="rounded-full border border-border/50 bg-muted/50 px-6 py-3 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">
                {isListening
                  ? "Listening…"
                  : isSpeaking
                    ? "Speaking…"
                    : isProcessing
                      ? "Processing…"
                      : "Ready"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
