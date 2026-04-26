"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWaikUser } from "@/hooks/use-waik-user"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Brain,
  Sparkles,
  AlertCircle,
  ClipboardList,
  SkipForward,
  Pencil,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis"

// ============================================================================
// TYPES
// ============================================================================

type Phase = "capture" | "analyzing" | "interview" | "review" | "processing" | "complete"

interface InterviewQuestion {
  id: string
  text: string
  phase: "initial" | "follow-up" | "final-critical"
  goldStandardField?: string
  isCritical: boolean
}

interface InterviewAnswer {
  questionId: string
  questionText: string
  text: string
  answeredAt: string
  method: "voice" | "text"
}

// ============================================================================
// INITIAL CAPTURE STEPS
// ============================================================================

type CaptureStep = 1 | 2 | 3

interface CapturePrompt {
  step: CaptureStep
  question: string
  field: "residentName" | "roomNumber" | "narrative"
  label: string
  placeholder: string
}

const CAPTURE_PROMPTS: CapturePrompt[] = [
  {
    step: 1,
    question: "Let's start by getting some basic information. What is the resident's name?",
    field: "residentName",
    label: "Resident Name",
    placeholder: "Enter resident's full name...",
  },
  {
    step: 2,
    question: "Thank you. What is the resident's room number?",
    field: "roomNumber",
    label: "Room Number",
    placeholder: "Enter room number...",
  },
  {
    step: 3,
    question:
      "Now, please describe what happened. Take your time and provide as much detail as possible about the incident.",
    field: "narrative",
    label: "Incident Description",
    placeholder: "Describe what happened in as much detail as possible...",
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function BetaCreateIncidentPage() {
  const router = useRouter()
  const { userId, role, name } = useWaikUser()

  // Phase management
  const [phase, setPhase] = useState<Phase>("capture")
  const [captureStep, setCaptureStep] = useState<CaptureStep>(1)

  // Capture data
  const [residentName, setResidentName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [narrative, setNarrative] = useState("")

  // Interview state
  const [interviewWorkSessionId, setInterviewWorkSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<InterviewAnswer[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isEditingAnswer, setIsEditingAnswer] = useState(false) // Track if we're editing an existing answer

  // Completeness tracking
  const [completenessScore, setCompletenessScore] = useState(0) // Dynamic - improves with answers
  const [initialReportCardScore, setInitialReportCardScore] = useState(0) // Static - from narrative only
  const [incidentCategory, setIncidentCategory] = useState<string>("detecting...")
  const [incidentSubtype, setIncidentSubtype] = useState<string | null>(null)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)

  // UI state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null)

  // Refs
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Speech synthesis
  const {
    speak: speakTTS,
    stopSpeaking: stopTTS,
    autoSpeak,
    setAutoSpeak,
    speechSupported,
  } = useSpeechSynthesis("en")

  // ============================================================================
  // SPEECH RECOGNITION SETUP
  // ============================================================================

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"
    }

    return () => {
      recognitionRef.current?.stop()
      stopTTS()
    }
  }, [stopTTS])

  // ============================================================================
  // VOICE HELPERS
  // ============================================================================

  const speakPrompt = useCallback(
    (text: string) => {
      if (!autoSpeak || !speechSupported) return
      speakTTS(text, {
        rate: 0.95,
        onstart: () => setIsSpeaking(true),
        onend: () => setIsSpeaking(false),
      })
    },
    [autoSpeak, speechSupported, speakTTS]
  )

  const startVoiceRecording = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    setIsListening(true)

    recognitionRef.current.onresult = (event: any) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }

      if (phase === "capture") {
        const currentPrompt = CAPTURE_PROMPTS[captureStep - 1]
        if (currentPrompt.field === "residentName") setResidentName(transcript)
        else if (currentPrompt.field === "roomNumber") setRoomNumber(transcript)
        else if (currentPrompt.field === "narrative") setNarrative(transcript)
      } else if (phase === "interview") {
        setCurrentAnswer(transcript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("[Beta] Speech recognition error:", event.error)
      if (event.error !== "no-speech") {
        toast.error("Error recognizing speech. Please try again.")
      }
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error("[Beta] Error starting recognition:", error)
      setIsListening(false)
    }
  }, [phase, captureStep])

  const stopVoiceRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  // ============================================================================
  // CAPTURE PHASE HANDLERS
  // ============================================================================

  const handleCaptureNext = async () => {
    if (captureStep < 3) {
      const nextStep = (captureStep + 1) as CaptureStep
      setCaptureStep(nextStep)
      if (autoSpeak) {
        speakPrompt(CAPTURE_PROMPTS[nextStep - 1].question)
      }
    } else {
      // Move to analyzing phase
      await startAnalysis()
    }
  }

  const handleCaptureBack = () => {
    if (captureStep > 1) {
      const prevStep = (captureStep - 1) as CaptureStep
      setCaptureStep(prevStep)
    }
  }

  const getCurrentCaptureValue = () => {
    const currentPrompt = CAPTURE_PROMPTS[captureStep - 1]
    if (currentPrompt.field === "residentName") return residentName
    if (currentPrompt.field === "roomNumber") return roomNumber
    if (currentPrompt.field === "narrative") return narrative
    return ""
  }

  const setCurrentCaptureValue = (value: string) => {
    const currentPrompt = CAPTURE_PROMPTS[captureStep - 1]
    if (currentPrompt.field === "residentName") setResidentName(value)
    else if (currentPrompt.field === "roomNumber") setRoomNumber(value)
    else if (currentPrompt.field === "narrative") setNarrative(value)
  }

  // ============================================================================
  // ANALYSIS PHASE
  // ============================================================================

  const startAnalysis = async () => {
    setPhase("analyzing")

    try {
      const response = await fetch("/api/agent/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentName,
          roomNumber,
          narrative,
          reportedById: userId,
          reportedByName: name,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start interview")
      }

      const data = await response.json()

      if (typeof data.sessionId === "string" && data.sessionId) {
        setInterviewWorkSessionId(data.sessionId)
      } else {
        setInterviewWorkSessionId(null)
      }

      setIncidentCategory(data.category || "fall")
      setIncidentSubtype(data.subtype || null)
      // Store initial completeness score (static report card - based on narrative only)
      setInitialReportCardScore(data.completenessScore || 0)
      setCompletenessScore(data.completenessScore || 0) // Start with same value, will update at review
      setQuestions(data.questions || [])

      // Move to interview phase
      setPhase("interview")
      setCurrentQuestionIndex(0)
      setIsEditingAnswer(false)

      // Speak the first question
      if (data.questions && data.questions.length > 0 && autoSpeak) {
        speakPrompt(data.questions[0].text)
      }
    } catch (error) {
      console.error("[Beta] Failed to start interview:", error)
      toast.error("Failed to analyze narrative. Please try again.")
      setPhase("capture")
    }
  }

  // ============================================================================
  // INTERVIEW PHASE - OPTIMIZED (No API call after each answer)
  // ============================================================================

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast.warning("Please provide an answer before continuing")
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    // Check if we're editing an existing answer or adding a new one
    const existingAnswerIndex = answers.findIndex((a) => a.questionId === currentQuestion.id)
    
    const newAnswer: InterviewAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      text: currentAnswer,
      answeredAt: new Date().toISOString(),
      method: isListening ? "voice" : "text",
    }

    let updatedAnswers: InterviewAnswer[]
    if (existingAnswerIndex >= 0) {
      // Update existing answer
      updatedAnswers = [...answers]
      updatedAnswers[existingAnswerIndex] = newAnswer
    } else {
      // Add new answer
      updatedAnswers = [...answers, newAnswer]
    }
    setAnswers(updatedAnswers)

    // Clear current answer
    setCurrentAnswer("")
    setIsEditingAnswer(false)

    // Move to next question or review (NO API CALL - just local state)
    if (currentQuestionIndex >= questions.length - 1) {
      // All questions done - go to review
      goToReview()
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)

      // Check if next question already has an answer (editing mode)
      const nextAnswer = updatedAnswers.find((a) => a.questionId === questions[nextIndex].id)
      if (nextAnswer) {
        setCurrentAnswer(nextAnswer.text)
        setIsEditingAnswer(true)
      }

      if (autoSpeak) {
        speakPrompt(questions[nextIndex].text)
      }
    }
  }

  const handleSkipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      // Check if next question already has an answer
      const nextAnswer = answers.find((a) => a.questionId === questions[nextIndex].id)
      if (nextAnswer) {
        setCurrentAnswer(nextAnswer.text)
        setIsEditingAnswer(true)
      } else {
        setCurrentAnswer("")
        setIsEditingAnswer(false)
      }
      
      if (autoSpeak) {
        speakPrompt(questions[nextIndex].text)
      }
    } else {
      goToReview()
    }
  }

  const handleBackToQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(prevIndex)
      
      // Restore previous answer if it exists
      const prevAnswer = answers.find((a) => a.questionId === questions[prevIndex].id)
      if (prevAnswer) {
        setCurrentAnswer(prevAnswer.text)
        setIsEditingAnswer(true)
      } else {
        setCurrentAnswer("")
        setIsEditingAnswer(false)
      }
    }
  }

  // Navigate to a specific question (used from review phase)
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
    const question = questions[index]
    const existingAnswer = answers.find((a) => a.questionId === question.id)
    
    if (existingAnswer) {
      setCurrentAnswer(existingAnswer.text)
      setIsEditingAnswer(true)
    } else {
      setCurrentAnswer("")
      setIsEditingAnswer(false)
    }
    
    setPhase("interview")
    
    if (autoSpeak) {
      speakPrompt(question.text)
    }
  }

  // ============================================================================
  // REVIEW PHASE - Calculate completeness here
  // ============================================================================

  const goToReview = async () => {
    setPhase("review")
    setIsCalculatingScore(true)

    // Calculate completeness score by analyzing combined narrative + answers
    try {
      const response = await fetch("/api/agent/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(interviewWorkSessionId ? { sessionId: interviewWorkSessionId } : {}),
          questionId: "final-review",
          answer: answers.map((a) => a.text).join(" "),
          narrative,
          previousAnswers: answers,
          category: incidentCategory,
          subtype: incidentSubtype,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCompletenessScore(data.completenessScore || 0)
      }
    } catch (error) {
      console.error("[Beta] Failed to calculate completeness:", error)
      // Fallback: estimate based on answers
      const estimatedScore = Math.min(95, 30 + answers.length * 10)
      setCompletenessScore(estimatedScore)
    } finally {
      setIsCalculatingScore(false)
    }
  }

  // ============================================================================
  // COMPLETE INTERVIEW
  // ============================================================================

  const completeInterview = async () => {
    setPhase("processing")

    try {
      const response = await fetch("/api/agent/interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(interviewWorkSessionId ? { sessionId: interviewWorkSessionId } : {}),
          residentName,
          roomNumber,
          narrative,
          reportedById: userId,
          reportedByName: name,
          reportedByRole: role,
          category: incidentCategory,
          subtype: incidentSubtype,
          questions, // Pass the questions so they can be saved
          answers,
          completenessScore, // Dynamic score (with answers)
          initialReportCardScore, // Static score (from narrative only - for Report Card)
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create incident")
      }

      const data = await response.json()
      setCreatedIncidentId(data.incidentId)
      setPhase("complete")

      toast.success("Incident reported successfully!")

      // Redirect after delay
      setTimeout(() => {
        if (role === "admin") {
          router.push(`/admin/incidents/${data.incidentId}`)
        } else {
          router.push(`/staff/incidents/${data.incidentId}`)
        }
      }, 3000)
    } catch (error) {
      console.error("[Beta] Failed to complete interview:", error)
      toast.error("Failed to create incident. Please try again.")
      setPhase("review")
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentCapturePrompt = CAPTURE_PROMPTS[captureStep - 1]
  const isNarrativeField = currentCapturePrompt?.field === "narrative"
  const currentQuestion = questions[currentQuestionIndex]
  
  // Count answered vs total
  const answeredCount = answers.length
  const totalQuestions = questions.length
  const unansweredQuestions = questions.filter((q) => !answers.find((a) => a.questionId === q.id))
  const hasUnansweredQuestions = unansweredQuestions.length > 0

  // Total steps: 3 capture + N interview questions
  const totalSteps = 3 + questions.length
  const currentStep = phase === "capture" 
    ? captureStep 
    : phase === "interview" 
    ? 3 + currentQuestionIndex + 1
    : totalSteps

  const progressPercent = phase === "complete" 
    ? 100 
    : phase === "processing" 
    ? 95 
    : phase === "review" 
    ? 90
    : (currentStep / totalSteps) * 85

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="flex min-h-screen w-full items-center justify-center p-4">
        <WaikCard className="w-full max-w-2xl overflow-hidden p-0">
          <div className="space-y-4 border-b border-border/50 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Report incident
                  </CardTitle>
                  <Badge variant="secondary" className="border-amber-300 bg-amber-100 text-amber-800">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Beta
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {phase === "capture" && `Step ${captureStep} of 3 — basic information`}
                  {phase === "analyzing" && "Analyzing your narrative…"}
                  {phase === "interview" &&
                    (isEditingAnswer
                      ? `Editing question ${currentQuestionIndex + 1} of ${questions.length}`
                      : `Question ${currentQuestionIndex + 1} of ${questions.length} — interview`)}
                  {phase === "review" && "Review your responses"}
                  {phase === "processing" && "Creating your incident report…"}
                  {phase === "complete" && "Report submitted successfully!"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setAutoSpeak(!autoSpeak)
                  if (!autoSpeak && phase === "capture" && currentCapturePrompt) {
                    speakPrompt(currentCapturePrompt.question)
                  } else if (!autoSpeak && phase === "interview" && currentQuestion) {
                    speakPrompt(currentQuestion.text)
                  } else {
                    stopTTS()
                    setIsSpeaking(false)
                  }
                }}
                className="h-12 w-12 min-h-12 shrink-0"
              >
                {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {phase === "capture" && "Gathering information"}
                  {phase === "analyzing" && "AI analysis"}
                  {phase === "interview" && `${answeredCount} of ${totalQuestions} answered`}
                  {phase === "review" && "Ready to submit"}
                  {phase === "processing" && "Creating report"}
                  {phase === "complete" && "Complete"}
                </span>
                {phase === "review" && !isCalculatingScore && (
                  <span className="font-medium text-primary">{completenessScore}% complete</span>
                )}
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {(phase === "interview" || phase === "review") && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <Brain className="mr-1 h-3 w-3" />
                  {incidentCategory}
                  {incidentSubtype && ` - ${incidentSubtype.replace("fall-", "")}`}
                </Badge>
                {isEditingAnswer && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    <Pencil className="mr-1 h-3 w-3" />
                    Editing
                  </Badge>
                )}
              </div>
            )}
          </div>

          <WaikCardContent className="space-y-6">
          {/* ================================================================ */}
          {/* CAPTURE PHASE */}
          {/* ================================================================ */}
          {phase === "capture" && (
            <>
              {/* Stop Speaking Button */}
              {isSpeaking && (
                <Button
                  onClick={() => {
                    stopTTS()
                    setIsSpeaking(false)
                  }}
                  variant="destructive"
                  className="min-h-12 w-full animate-pulse"
                >
                  <VolumeX className="mr-2 h-5 w-5" />
                  Stop speaking
                </Button>
              )}

              {/* Voice Prompt */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {currentCapturePrompt.question}
                </p>
              </div>

              {/* Input Field */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{currentCapturePrompt.label}</Label>
                {isNarrativeField ? (
                  <Textarea
                    ref={textareaRef}
                    value={getCurrentCaptureValue()}
                    onChange={(e) => setCurrentCaptureValue(e.target.value)}
                    placeholder={currentCapturePrompt.placeholder}
                    className="min-h-[200px] max-h-[60vh] text-base resize-none"
                  />
                ) : (
                  <Input
                    value={getCurrentCaptureValue()}
                    onChange={(e) => setCurrentCaptureValue(e.target.value)}
                    placeholder={currentCapturePrompt.placeholder}
                    className="text-base h-12"
                  />
                )}
              </div>

              {/* Voice Input Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {captureStep > 1 && (
                  <Button
                    onClick={handleCaptureBack}
                    variant="outline"
                    className="h-14 text-base"
                    disabled={isListening}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>
                )}

                <Button
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  variant={isListening ? "destructive" : "outline"}
                  className="flex-1 h-14 text-base"
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-5 w-5 animate-pulse" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Use Voice
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCaptureNext}
                  className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={isListening || !getCurrentCaptureValue().trim()}
                >
                  {captureStep === 3 ? (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Analyze & Continue
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* ANALYZING PHASE */}
          {/* ================================================================ */}
          {phase === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />
                <Brain className="h-20 w-20 text-primary animate-pulse relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold">Analyzing Your Narrative...</p>
                <p className="text-muted-foreground">
                  Identifying incident type and generating targeted questions
                </p>
              </div>
              <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* INTERVIEW PHASE - Form-like UI */}
          {/* ================================================================ */}
          {phase === "interview" && currentQuestion && (
            <>
              {/* Stop Speaking Button */}
              {isSpeaking && (
                <Button
                  onClick={() => {
                    stopTTS()
                    setIsSpeaking(false)
                  }}
                  variant="destructive"
                  className="w-full animate-pulse"
                >
                  <VolumeX className="mr-2 h-5 w-5" />
                  Stop Speaking
                </Button>
              )}

              {/* Question Prompt - Same style as capture phase */}
              <div
                className={`rounded-2xl border border-border/50 p-6 ${
                  isEditingAnswer
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10"
                    : "bg-gradient-to-r from-primary/10 to-accent/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-2 flex-shrink-0 ${
                    isEditingAnswer ? "bg-amber-500/20" : "bg-primary/20"
                  }`}>
                    {isEditingAnswer ? (
                      <Pencil className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Brain className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {isEditingAnswer ? "Editing Answer" : "AI-Generated Question"}
                      {currentQuestion.goldStandardField && (
                        <span className="ml-2 text-primary">• {currentQuestion.goldStandardField}</span>
                      )}
                    </p>
                    <p className="text-lg font-medium text-foreground leading-relaxed">
                      {currentQuestion.text}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {isEditingAnswer ? "Edit Your Response" : "Your Response"}
                </Label>
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer or use voice input..."
                  className="min-h-[120px] text-base resize-none"
                  disabled={isProcessing}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {currentQuestionIndex > 0 && (
                  <Button
                    onClick={handleBackToQuestion}
                    variant="outline"
                    className="h-14 text-base"
                    disabled={isProcessing || isListening}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>
                )}

                <Button
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  variant={isListening ? "destructive" : "outline"}
                  className="flex-1 h-14 text-base"
                  disabled={isProcessing}
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-5 w-5 animate-pulse" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Use Voice
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSubmitAnswer}
                  className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={isProcessing || isListening || !currentAnswer.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : currentQuestionIndex >= questions.length - 1 ? (
                    <>
                      {isEditingAnswer ? "Save & Review" : "Review & Submit"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      {isEditingAnswer ? "Save & Next" : "Next Question"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              {/* Skip option for non-critical questions (only if not editing) */}
              {!currentQuestion.isCritical && !isEditingAnswer && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleSkipQuestion}
                  disabled={isProcessing}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip this question
                </Button>
              )}

              {/* Go to Review button (if editing) */}
              {isEditingAnswer && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={goToReview}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Back to Review
                </Button>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* REVIEW PHASE */}
          {/* ================================================================ */}
          {phase === "review" && (
            <>
              <div className="rounded-2xl border border-border/50 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Ready to Submit</p>
                    <p className="text-sm text-muted-foreground">
                      {isCalculatingScore 
                        ? "Calculating documentation score..." 
                        : `Documentation completeness: ${completenessScore}%`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary of incident */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardList className="h-4 w-4" />
                  Incident Summary
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Resident</p>
                    <p className="font-medium">{residentName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Room</p>
                    <p className="font-medium">{roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium capitalize">{incidentCategory}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Questions Answered</p>
                    <p className="font-medium">{answeredCount} of {totalQuestions}</p>
                  </div>
                </div>
              </div>

              {/* List of Q&A with Edit buttons */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Interview Responses - Click to edit
                </p>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {questions.map((question, index) => {
                    const answer = answers.find((a) => a.questionId === question.id)
                    return (
                      <div 
                        key={question.id} 
                        className={`rounded-lg p-4 space-y-2 cursor-pointer transition-colors ${
                          answer 
                            ? "bg-muted/30 hover:bg-muted/50" 
                            : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                        }`}
                        onClick={() => goToQuestion(index)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-primary flex-1">
                            Q{index + 1}: {question.text}
                          </p>
                          <Button variant="ghost" size="sm" className="h-8 px-2 flex-shrink-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        {answer ? (
                          <>
                            <p className="text-sm text-foreground">{answer.text}</p>
                            <p className="text-xs text-muted-foreground">
                              Answered via {answer.method}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-amber-600 italic">Not answered - click to add</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Warning if completeness is low */}
              {!isCalculatingScore && completenessScore < 70 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Documentation below 70%</p>
                    <p className="text-xs">Follow-up questions will be sent to complete the report.</p>
                  </div>
                </div>
              )}

              {/* Warning if there are unanswered questions */}
              {hasUnansweredQuestions && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{unansweredQuestions.length} question(s) not answered</p>
                    <p className="text-xs">Click on unanswered questions above to add responses.</p>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {hasUnansweredQuestions && (
                  <Button
                    onClick={() => {
                      // Go to first unanswered question
                      const firstUnansweredIndex = questions.findIndex(
                        (q) => !answers.find((a) => a.questionId === q.id)
                      )
                      if (firstUnansweredIndex >= 0) {
                        goToQuestion(firstUnansweredIndex)
                      }
                    }}
                    variant="outline"
                    className="flex-1 h-14 text-base"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Answer Remaining ({unansweredQuestions.length})
                  </Button>
                )}

                <Button
                  onClick={completeInterview}
                  className="flex-1 h-14 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90"
                  disabled={isCalculatingScore}
                >
                  {isCalculatingScore ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* PROCESSING PHASE */}
          {/* ================================================================ */}
          {phase === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />
                <Loader2 className="h-20 w-20 text-primary animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold">Creating Incident Report...</p>
                <p className="text-muted-foreground">
                  Saving your responses and generating follow-up questions
                </p>
              </div>
              <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* COMPLETE PHASE */}
          {/* ================================================================ */}
          {phase === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
                <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-green-600">Report Submitted Successfully!</p>
                <p className="text-muted-foreground">Redirecting to incident details...</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Incident category: <strong className="capitalize">{incidentCategory}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Documentation completeness: <strong>{completenessScore}%</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Questions answered: <strong>{answers.length}</strong></span>
                </div>
                {completenessScore < 70 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Follow-up questions will be sent to complete documentation</span>
                  </div>
                )}
              </div>
            </div>
          )}
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
