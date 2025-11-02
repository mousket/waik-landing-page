"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/lib/auth-store"
import {
  ArrowLeft,
  Save,
  MessageSquare,
  FileText,
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Mic,
  MicOff,
  Type,
  Volume2,
  CheckCircle2,
  Circle,
  Send,
  Loader2,
  Nut as Input,
} from "lucide-react"
import { toast } from "sonner"
import type { Incident } from "@/lib/types"
import { format } from "date-fns"

function formatDate(dateString: string | undefined, formatString: string): string {
  if (!dateString) return "Invalid date"

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }
    return format(date, formatString)
  } catch (error) {
    return "Invalid date"
  }
}

export default function StaffIncidentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { userId } = useAuthStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [qaMode, setQaMode] = useState<"text" | "voice">("text")
  const [isRecording, setIsRecording] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [voiceAnswers, setVoiceAnswers] = useState<Record<string, string>>({})
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [intelligenceMessages, setIntelligenceMessages] = useState<IntelligenceMessage[]>([])
  const [intelligenceInput, setIntelligenceInput] = useState("")
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
  const [isIntelligenceRecording, setIsIntelligenceRecording] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const intelligenceRecognitionRef = useRef<any>(null)

  useEffect(() => {
    fetchIncident()

    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false
        recognitionInstance.lang = "en-US"
        setRecognition(recognitionInstance)
      }

      if (window.speechSynthesis) {
        setSynthesis(window.speechSynthesis)
      }
    }
  }, [params.id])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${params.id}`)
      if (!response.ok) throw new Error("Failed to fetch incident")
      const data = await response.json()
      setIncident(data)

      const initialAnswers: Record<string, string> = {}
      data.questions.forEach((q: Incident["questions"][0]) => {
        if (!q.answer) {
          initialAnswers[q.id] = ""
        }
      })
      setAnswers(initialAnswers)
    } catch (error) {
      console.error("[v0] Error fetching incident:", error)
      toast.error("Failed to load incident details")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProgress = async () => {
    if (!incident || !userId) return

    setSaving(true)
    try {
      const savePromises = Object.entries(answers)
        .filter(([_, answerText]) => answerText.trim() !== "")
        .map(([questionId, answerText]) =>
          fetch(`/api/incidents/${params.id}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              answerText,
              answeredBy: userId,
              method: "text",
            }),
          }),
        )

      await Promise.all(savePromises)

      toast.success("Progress saved successfully")

      await fetchIncident()
    } catch (error) {
      console.error("[v0] Error saving progress:", error)
      toast.error("Failed to save your answers")
    } finally {
      setSaving(false)
    }
  }

  const speakQuestion = (questionText: string) => {
    if (!synthesis) {
      toast.error("Text-to-speech not supported in your browser")
      return
    }

    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(questionText)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      setTimeout(() => startRecording(), 500)
    }

    synthesis.speak(utterance)
  }

  const startRecording = () => {
    if (!recognition) {
      toast.error("Speech recognition not supported in your browser")
      return
    }

    setIsRecording(true)
    setCurrentTranscript("")

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setCurrentTranscript(transcript)
      setIsEditingTranscript(true)
      toast.success("Answer recorded! Review and save to continue.")
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      toast.error("Could not capture your voice. Please try again.")
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    try {
      recognition.start()
    } catch (error) {
      console.error("[v0] Error starting recognition:", error)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop()
      setIsRecording(false)
    }
  }

  const handleSaveCurrentAnswer = async () => {
    if (!currentTranscript.trim() || !incident || !userId) return

    const currentQuestion = unansweredQuestions[currentQuestionIndex]

    setSaving(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerText: currentTranscript,
          answeredBy: userId,
          method: "voice",
        }),
      })

      if (!response.ok) throw new Error("Failed to save answer")

      toast.success("Answer saved!")

      setVoiceAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: currentTranscript,
      }))

      await fetchIncident()

      setCurrentTranscript("")
      setIsEditingTranscript(false)

      const remainingQuestions = incident.questions.filter((q) => !q.answer && q.id !== currentQuestion.id)

      if (remainingQuestions.length > 0) {
        // Move to next question
        setTimeout(() => {
          speakQuestion(remainingQuestions[0].questionText)
        }, 500)
      } else {
        // All questions answered
        toast.success("All questions answered! Great job!")
        setQaMode("text")
      }
    } catch (error) {
      console.error("[v0] Error saving answer:", error)
      toast.error("Failed to save your answer")
    } finally {
      setSaving(false)
    }
  }

  // They are replaced by handleSaveCurrentAnswer

  const handleStartVoiceMode = () => {
    if (!incident || incident.questions.filter((q) => !q.answer).length === 0) {
      toast.error("No questions to answer")
      return
    }

    if (!recognition || !synthesis) {
      toast.error("Voice features not supported in your browser. Please use Chrome or Edge.")
      return
    }

    setCurrentQuestionIndex(0)
    setVoiceAnswers({})
    setTimeout(() => {
      speakQuestion(incident.questions.filter((q) => !q.answer)[0].questionText || "")
    }, 500)
  }

  const handleIntelligenceSubmit = async () => {
    if (!intelligenceInput.trim() || !incident) return

    const userMessage: IntelligenceMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      text: intelligenceInput,
      timestamp: new Date(),
    }

    setIntelligenceMessages((prev) => [...prev, userMessage])
    setIntelligenceInput("")
    setIsIntelligenceLoading(true)

    try {
      const response = await fetch(`/api/incidents/${params.id}/intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: intelligenceInput }),
      })

      if (!response.ok) throw new Error("Failed to get intelligence response")

      const data = await response.json()

      const aiMessage: IntelligenceMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        text: data.answer,
        timestamp: new Date(),
      }

      setIntelligenceMessages((prev) => [...prev, aiMessage])

      if (autoSpeak) {
        speakIntelligenceText(data.answer)
      }
    } catch (error) {
      console.error("[v0] Error getting intelligence response:", error)
      toast.error("Failed to get response. Please try again.")
    } finally {
      setIsIntelligenceLoading(false)
    }
  }

  const speakIntelligenceText = (text: string) => {
    if ("speechSynthesis" in window && synthesis) {
      synthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synthesis.speak(utterance)
    }
  }

  const startIntelligenceVoiceRecording = () => {
    if (!recognition) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    setIsIntelligenceRecording(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setIntelligenceInput(transcript)
      setIsIntelligenceRecording(false)
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      setIsIntelligenceRecording(false)
      toast.error("Voice recognition failed. Please try again.")
    }

    recognition.onend = () => {
      setIsIntelligenceRecording(false)
    }

    intelligenceRecognitionRef.current = recognition
    try {
      recognition.start()
    } catch (error) {
      console.error("[v0] Error starting recognition:", error)
      setIsIntelligenceRecording(false)
    }
  }

  const stopIntelligenceVoiceRecording = () => {
    if (intelligenceRecognitionRef.current) {
      intelligenceRecognitionRef.current.stop()
      setIsIntelligenceRecording(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [intelligenceMessages, isIntelligenceLoading])

  const unansweredQuestions = incident?.questions.filter((q) => !q.answer) || []
  const answeredQuestions = incident?.questions.filter((q) => q.answer) || []
  const aiContent = incident ? getAIContent(incident.id) : null

  return (
    <div className="min-h-screen relative overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="space-y-6 relative max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/staff/dashboard")} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-2 bg-white/50 p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="qa" className="data-[state=active]:bg-white">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Q&A</span>
              <span className="sm:hidden">Q&A</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="data-[state=active]:bg-white">
              <Mic className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Intelligence</span>
              <span className="sm:hidden">Intel</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-white">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">AI Summary</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      {incident?.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{incident?.description}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={incident?.priority === "high" ? "destructive" : "secondary"}>
                      {incident?.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{incident?.status.toUpperCase()}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resident</p>
                    <p className="font-medium">
                      {incident?.residentName}{" "}
                      <span className="text-muted-foreground">(Room {incident?.residentRoom})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Staff Member</p>
                    <p className="font-medium">{incident?.staffName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="font-medium">{formatDate(incident?.createdAt, "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-medium">{formatDate(incident?.updatedAt, "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="qa" className="space-y-6 mt-6">
            <Card className="bg-white shadow-lg border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Answer Questions
                </CardTitle>
                <CardDescription>Choose how you'd like to answer questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={qaMode === "text" ? "default" : "outline"}
                    onClick={() => setQaMode("text")}
                    className="flex-1"
                  >
                    <Type className="mr-2 h-4 w-4" />
                    Text Mode
                  </Button>
                  <Button
                    variant={qaMode === "voice" ? "default" : "outline"}
                    onClick={() => {
                      setQaMode("voice")
                      if (unansweredQuestions.length > 0) {
                        handleStartVoiceMode()
                      }
                    }}
                    className="flex-1"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Voice Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {qaMode === "text" && unansweredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <MessageSquare className="h-5 w-5" />
                    Questions Awaiting Your Response ({unansweredQuestions.length})
                  </CardTitle>
                  <CardDescription>Type your answers below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {unansweredQuestions.map((question) => (
                    <div key={question.id} className="space-y-3 p-4 border rounded-lg bg-accent/5">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm sm:text-base">{question.questionText}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Asked {formatDate(question.askedAt, "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Type your answer here..."
                        value={answers[question.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>
                  ))}

                  <Button onClick={handleSaveProgress} disabled={saving} className="w-full sm:w-auto" size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Progress"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {qaMode === "voice" && unansweredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Mic className="h-5 w-5" />
                    Voice Mode - Question {currentQuestionIndex + 1} of {unansweredQuestions.length}
                  </CardTitle>
                  <CardDescription>Listen to the question and speak your answer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question Progress */}
                  <div className="flex gap-2 flex-wrap">
                    {unansweredQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                          idx === currentQuestionIndex
                            ? "bg-primary text-primary-foreground"
                            : voiceAnswers[q.id]
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {voiceAnswers[q.id] ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}Q
                        {idx + 1}
                      </div>
                    ))}
                  </div>

                  {/* Current Question */}
                  <div className="p-6 border-2 border-primary/20 rounded-lg bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Volume2 className={`h-5 w-5 text-primary mt-1 ${isSpeaking ? "animate-pulse" : ""}`} />
                      <div className="flex-1">
                        <p className="font-medium text-lg leading-relaxed">
                          {unansweredQuestions[currentQuestionIndex]?.questionText}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Asked{" "}
                          {formatDate(unansweredQuestions[currentQuestionIndex]?.askedAt, "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recording Status */}
                  <div className="flex flex-col items-center gap-4 py-8">
                    {isSpeaking && (
                      <div className="text-center">
                        <Volume2 className="h-12 w-12 text-primary mx-auto mb-2 animate-pulse" />
                        <p className="text-sm font-medium">Reading question...</p>
                      </div>
                    )}

                    {isRecording && (
                      <div className="text-center">
                        <div className="relative">
                          <Mic className="h-16 w-16 text-destructive mx-auto" />
                          <div className="absolute inset-0 animate-ping">
                            <Mic className="h-16 w-16 text-destructive/30 mx-auto" />
                          </div>
                        </div>
                        <p className="text-sm font-medium mt-2">Listening...</p>
                        <p className="text-xs text-muted-foreground">Speak your answer now</p>
                      </div>
                    )}

                    {!isSpeaking && !isRecording && !isEditingTranscript && (
                      <div className="text-center">
                        <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Ready to record</p>
                      </div>
                    )}
                  </div>

                  {currentTranscript && (
                    <div className="p-6 border-2 rounded-lg bg-green-50 border-green-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-green-900">Your Answer (Review & Edit):</p>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Mic className="h-3 w-3 mr-1" />
                          Voice
                        </Badge>
                      </div>
                      <Textarea
                        value={currentTranscript}
                        onChange={(e) => setCurrentTranscript(e.target.value)}
                        className="min-h-[120px] bg-white border-green-300 focus:border-green-500 text-base"
                        placeholder="Your transcribed answer will appear here..."
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveCurrentAnswer}
                          disabled={saving || !currentTranscript.trim()}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {saving ? "Saving..." : "Save & Continue"}
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentTranscript("")
                            setIsEditingTranscript(false)
                            toast.info("Answer discarded. Record again.")
                          }}
                          variant="outline"
                          disabled={saving}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => speakQuestion(unansweredQuestions[currentQuestionIndex]?.questionText || "")}
                      disabled={isSpeaking || isRecording || saving}
                      variant="outline"
                      className="flex-1"
                    >
                      <Volume2 className="mr-2 h-4 w-4" />
                      Repeat Question
                    </Button>

                    {!isRecording && !isEditingTranscript ? (
                      <Button
                        onClick={startRecording}
                        disabled={isSpeaking || saving}
                        variant="default"
                        className="flex-1"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </Button>
                    ) : isRecording ? (
                      <Button onClick={stopRecording} variant="destructive" className="flex-1">
                        <MicOff className="mr-2 h-4 w-4" />
                        Stop Recording
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No questions message */}
            {unansweredQuestions.length === 0 && (
              <Card className="bg-white shadow-lg">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="font-medium mb-2">All questions answered!</p>
                  <p className="text-sm text-muted-foreground">
                    Great job completing all the questions for this incident.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Answered questions section */}
            {answeredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-primary">Your Previous Answers ({answeredQuestions.length})</CardTitle>
                  <CardDescription>Questions you've already responded to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {answeredQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      {index > 0 && <Separator />}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-1">
                            Q
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{question.questionText}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Asked {formatDate(question.askedAt, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 ml-8 mt-2">
                          <Badge className="bg-primary mt-1">A</Badge>
                          <div className="flex-1">
                            <p className="text-sm">{question.answer?.answerText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                Answered {formatDate(question.answer?.answeredAt, "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                {question.answer?.method === "voice" ? (
                                  <>
                                    <Mic className="h-3 w-3 mr-1" /> voice
                                  </>
                                ) : (
                                  <>
                                    <Type className="h-3 w-3 mr-1" /> text
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg h-[600px] sm:h-[650px] lg:h-[calc(100vh-16rem)] flex flex-col">
              <CardHeader className="flex-shrink-0 pb-3 sm:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                    </div>
                    <CardTitle className="text-base sm:text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent truncate">
                      Incident Intelligence
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className="flex items-center gap-1.5 flex-shrink-0 h-9 px-3"
                  >
                    {autoSpeak ? (
                      <>
                        <Volume2 className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Audio On</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 opacity-50" />
                        <span className="hidden sm:inline text-xs">Audio Off</span>
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Ask questions about this incident using voice or text
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 space-y-3 sm:space-y-4">
                  {intelligenceMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 px-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 blur-3xl rounded-full" />
                        <Brain className="h-12 w-12 sm:h-16 sm:w-16 text-primary relative" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">
                          Ask me anything about this incident
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-2">
                          I can help you understand what happened, who was involved, current status, and provide
                          recommendations.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center max-w-2xl px-2">
                        {[
                          "What happened?",
                          "Who was involved?",
                          "What's the current status?",
                          "What are the next steps?",
                        ].map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIntelligenceInput(suggestion)
                              setTimeout(() => handleIntelligenceSubmit(), 100)
                            }}
                            className="text-xs h-8 px-3"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {intelligenceMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 sm:gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.type === "ai" && (
                            <div className="flex-shrink-0">
                              <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                              </div>
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground border border-border"
                            }`}
                          >
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                            <p
                              className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                            >
                              {format(message.timestamp, "h:mm a")}
                            </p>
                          </div>
                          {message.type === "user" && (
                            <div className="flex-shrink-0">
                              <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-[10px] sm:text-xs font-semibold text-accent-foreground">You</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {isIntelligenceLoading && (
                        <div className="flex gap-2 sm:gap-3 justify-start">
                          <div className="flex-shrink-0">
                            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white animate-pulse" />
                            </div>
                          </div>
                          <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 bg-muted border border-border">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                              </div>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                Analyzing incident data...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex-shrink-0 border-t bg-background p-3 sm:p-4">
                  {isSpeaking && (
                    <div className="mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm text-primary">
                      <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
                      <span>Speaking response...</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 relative min-w-0">
                      <Input
                        placeholder="Ask a question..."
                        value={intelligenceInput}
                        onChange={(e) => setIntelligenceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleIntelligenceSubmit()
                          }
                        }}
                        disabled={isIntelligenceLoading || isIntelligenceRecording}
                        className="pr-10 h-10 sm:h-11 text-sm sm:text-base"
                      />
                      {isIntelligenceRecording && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="flex gap-0.5 sm:gap-1">
                            <div className="h-3 w-0.5 sm:w-1 bg-destructive rounded-full animate-pulse" />
                            <div className="h-3 w-0.5 sm:w-1 bg-destructive rounded-full animate-pulse [animation-delay:0.2s]" />
                            <div className="h-3 w-0.5 sm:w-1 bg-destructive rounded-full animate-pulse [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant={isIntelligenceRecording ? "destructive" : "outline"}
                      onClick={
                        isIntelligenceRecording ? stopIntelligenceVoiceRecording : startIntelligenceVoiceRecording
                      }
                      disabled={isIntelligenceLoading}
                      className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11"
                    >
                      <Mic className={`h-4 w-4 sm:h-5 sm:w-5 ${isIntelligenceRecording ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleIntelligenceSubmit}
                      disabled={!intelligenceInput.trim() || isIntelligenceLoading || isIntelligenceRecording}
                      className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11"
                    >
                      {isIntelligenceLoading ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 leading-relaxed">
                    Press Enter to send • Click mic for voice • {autoSpeak ? "Audio on" : "Audio off"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <CardTitle className="text-base">Incident Summary</CardTitle>
                  </div>
                  <CardDescription>AI-generated summary based on incident details</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiContent ? (
                    <p className="text-sm leading-relaxed">{aiContent.summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No AI content available for this incident</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-accent/20 lg:col-span-2 bg-white shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent" />
                    <CardTitle className="text-base">Incident Insights</CardTitle>
                  </div>
                  <CardDescription>AI-generated analysis answering key questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent ? (
                    <>
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-accent">What happened?</h4>
                        <p className="text-sm leading-relaxed">{aiContent.insights.whatHappened}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-accent">What happened to the resident?</h4>
                        <p className="text-sm leading-relaxed">{aiContent.insights.residentImpact}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-accent">
                          How could we have prevented this incident?
                        </h4>
                        <p className="text-sm leading-relaxed">{aiContent.insights.prevention}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-accent">
                          What should we do to stop incidents like this in the future?
                        </h4>
                        <p className="text-sm leading-relaxed">{aiContent.insights.futureActions}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No AI insights available for this incident</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </div>
                  <CardDescription>AI-generated recommendations for improvement</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiContent ? (
                    <ul className="space-y-2">
                      {aiContent.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm leading-relaxed flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No AI recommendations available for this incident
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" />
                    <CardTitle className="text-base">Action Items</CardTitle>
                  </div>
                  <CardDescription>AI-generated action items to implement</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiContent ? (
                    <ul className="space-y-2">
                      {aiContent.actions.map((action, index) => (
                        <li key={index} className="text-sm leading-relaxed flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No AI actions available for this incident</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

type IntelligenceMessage = {
  id: string
  type: "user" | "ai"
  text: string
  timestamp: Date
}

function getAIContent(incidentId: string) {
  const aiContent: Record<
    string,
    {
      summary: string
      insights: {
        whatHappened: string
        residentImpact: string
        prevention: string
        futureActions: string
      }
      recommendations: string[]
      actions: string[]
    }
  > = {
    "inc-1": {
      summary:
        "Resident Margaret Thompson experienced a fall at 8:15 AM while attempting to get out of bed in Room 204. Staff member Sarah Johnson discovered the resident on the floor during morning rounds. The resident sustained minor bruising on the left hip, which was assessed by nursing staff and treated with an ice pack.",
      insights: {
        whatHappened:
          "Resident fell while attempting to get out of bed unassisted during morning rounds. The fall occurred at approximately 8:15 AM when the resident was trying to reach the bathroom.",
        residentImpact:
          "Minor bruising on left hip area. No fractures or serious injuries detected. Resident remained alert and oriented. Ice pack applied immediately, and nursing assessment completed within 15 minutes of discovery.",
        prevention:
          "Bed rails should have been raised during the night. Call button was not within easy reach of the resident. The resident may have been attempting to avoid disturbing staff during busy morning rounds.",
        futureActions:
          "Implement bed alarm system for high-risk residents. Ensure call buttons are always within reach and test functionality during each shift. Increase frequency of morning rounds in rooms with fall-risk residents. Review and update fall prevention care plan.",
      },
      recommendations: [
        "Install bed alarm system to alert staff when resident attempts to get out of bed unassisted",
        "Conduct comprehensive fall risk assessment and update care plan with specific interventions",
        "Review room layout to ensure bathroom accessibility and consider installing grab bars",
      ],
      actions: [
        "Schedule physical therapy evaluation within 48 hours to assess mobility and recommend assistive devices",
        "Update resident's care plan to include fall prevention protocols and increased monitoring",
        "Conduct staff training session on fall prevention best practices and proper use of bed alarms",
      ],
    },
    "inc-2": {
      summary:
        "Morning medication for resident Robert Williams in Room 312 was administered 30 minutes late due to staffing constraints during the morning shift. The delay occurred on January 21st at 10:00 AM, affecting the resident's scheduled 9:30 AM medication administration.",
      insights: {
        whatHappened:
          "Medication administration was delayed by 30 minutes due to unexpected staffing shortage during morning shift. The primary medication nurse was assisting with an emergency in another wing, and backup protocols were not immediately activated.",
        residentImpact:
          "No adverse effects reported from the 30-minute delay. Resident took medication without issue once administered. Vital signs remained stable throughout the morning. Resident was informed of the delay and expressed understanding.",
        prevention:
          "Staffing levels were below optimal during peak medication administration hours. Backup medication administration protocols were not clearly communicated to available staff. Emergency response in another wing created cascading delays.",
        futureActions:
          "Review and adjust staffing schedules to ensure adequate coverage during peak medication times. Implement clear backup protocols for medication administration. Create a medication administration priority system for time-sensitive medications. Cross-train additional staff members on medication administration procedures.",
      },
      recommendations: [
        "Adjust morning shift staffing schedule to ensure minimum two qualified medication administrators are available",
        "Implement digital medication tracking system with automated alerts for approaching administration times",
        "Create and document clear backup protocols for medication administration during emergencies",
      ],
      actions: [
        "Review and update medication administration schedule to identify and prioritize time-critical medications",
        "Initiate hiring process for additional qualified nursing staff to improve coverage ratios",
        "Implement digital medication management system with real-time tracking and automated reminders",
      ],
    },
    "inc-3": {
      summary:
        "Resident Elizabeth Davis in Room 108, who has a documented lactose intolerance, was served a meal containing dairy products on January 22nd at lunch. The error was discovered by staff before the resident consumed the meal, preventing any adverse reaction.",
      insights: {
        whatHappened:
          "Kitchen staff prepared and delivered a meal containing dairy products to a resident with documented lactose intolerance. The error occurred during lunch service when a substitute kitchen worker was unfamiliar with the dietary restriction flagging system.",
        residentImpact:
          "No adverse effects as the error was caught by nursing staff before the resident consumed the meal. Replacement meal was provided within 15 minutes. Resident expressed appreciation for staff vigilance and was not distressed by the incident.",
        prevention:
          "Dietary restriction information was not prominently displayed on the meal tray. Substitute kitchen staff had not received adequate training on the dietary restriction system. Communication gap between dietary department and nursing staff during shift change.",
        futureActions:
          "Implement visual dietary restriction alert system on all meal trays and in kitchen preparation area. Ensure all kitchen staff, including substitutes, receive comprehensive training on dietary restrictions. Establish mandatory meal verification checklist before delivery. Create regular audit system for dietary compliance.",
      },
      recommendations: [
        "Create highly visible dietary restriction alerts using color-coded labels on meal trays and resident room cards",
        "Update kitchen communication protocols to include mandatory dietary restriction verification before meal preparation",
        "Implement pre-delivery meal verification process where nursing staff confirms dietary compliance",
      ],
      actions: [
        "Install visual dietary alert system with color-coded labels and digital displays in kitchen and on meal trays",
        "Conduct comprehensive dietary restriction training for all kitchen and nursing staff within one week",
        "Establish meal verification checklist that requires sign-off from both kitchen and nursing staff before delivery",
      ],
    },
  }

  return aiContent[incidentId] || null
}
