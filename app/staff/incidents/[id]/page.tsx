"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthStore } from "@/lib/auth-store"
import { escapeHtml } from "@/lib/utils"
import { renderMarkdownOrHtml } from "@/lib/utils/markdown-to-html"
import { buildIncidentCombinedNarrative } from "@/lib/utils/incident-narrative"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
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
  Send,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import type { Incident, User as Staff } from "@/lib/types"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"

type MessageRole = "ai" | "nurse" | "system"

interface ConversationMessage {
  id: string
  role: MessageRole
  text: string
  timestamp: string
}

type IntelligenceMessage = {
  id: string
  type: "user" | "ai"
  text: string
  timestamp: Date
}

interface PendingQuestion {
  id: string
  text: string
  askedAt?: string
}

const fallbackParagraphHtml = (value: string) =>
  `<p>${escapeHtml(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br />")}</p>`

const formatScore = (value: number | undefined | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0"
  const fixed = value.toFixed(1)
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
}

const buildQuickCritique = (reportCard: {
  strengths: string[]
  gaps: string[]
  feedback: string
}) => {
  const primaryStrength = reportCard.strengths[0]
  const primaryGap = reportCard.gaps[0]

  const strengthsSnippet = primaryStrength
    ? `You covered ${primaryStrength.toLowerCase()}.`
    : "Baseline facts captured."
  const gapsSnippet = primaryGap ? `Missing detail on ${primaryGap.toLowerCase()}.` : "No major gaps flagged."

  const sentences = reportCard.feedback
    ?.split(/[.!?]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .slice(0, 5)

  const adviceSentence =
    sentences.find((sentence) =>
      /(next|please|try|consider|remember|ensure|aim|focus|add|include)/i.test(sentence),
    ) ||
    (primaryGap ? `Try to include ${primaryGap.toLowerCase()} next time.` : "")

  return {
    strengthsSnippet,
    gapsSnippet,
    adviceSnippet: adviceSentence,
  }
}

const formatDate = (dateString: string | undefined, formatString: string): string => {
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
  const { userId, role } = useAuthStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("")

  const [currentAnsweredQuestionTab, setCurrentAnsweredQuestionTab] = useState(0)

  const [currentTextQuestionIndex, setCurrentTextQuestionIndex] = useState(0)

  const [qaMode, setQaMode] = useState<"text" | "voice">("text")
  const [isRecording, setIsRecording] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [voiceAnswers, setVoiceAnswers] = useState<Record<string, string>>({})
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [reportCard, setReportCard] = useState<{
    score: number
    completenessScore: number
    feedback: string
    strengths: string[]
    gaps: string[]
  } | null>(null)
  const [reportCardLoading, setReportCardLoading] = useState(false)
  const [reportCardError, setReportCardError] = useState<string | null>(null)
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    gaps: true,
    narrative: false,
  })

  const [intelligenceMessages, setIntelligenceMessages] = useState<IntelligenceMessage[]>([])
  const [intelligenceInput, setIntelligenceInput] = useState("")
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
  const [isIntelligenceRecording, setIsIntelligenceRecording] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const intelligenceRecognitionRef = useRef<any>(null)

  const [showOriginalNarrative, setShowOriginalNarrative] = useState(false)
  const [showInvestigativeHighlights, setShowInvestigativeHighlights] = useState(true)
  const [showReportCard, setShowReportCard] = useState(true)

  useEffect(() => {
    fetchIncident()
    fetchEmployeeList()

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

  const fetchEmployeeList = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const users = await response.json()
        setStaffList(users)
      }
    } catch (error) {
      console.error("[v0] Error fetching employee list:", error)
    }
  }

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

  const handleAssignQuestion = async (questionId: string) => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee")
      return
    }

    try {
      const response = await fetch(`/api/incidents/${params.id}/questions/${questionId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: selectedEmployees,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign question")

      toast.success(`Question assigned to ${selectedEmployees.length} employee(s)`)
      setSelectedEmployees([])
      setEmployeeSearchQuery("")
      await fetchIncident()
    } catch (error) {
      console.error("[v0] Error assigning question:", error)
      toast.error("Failed to assign question")
    }
  }

  const handleSaveProgress = async () => {
    if (!incident || !userId) return

    const currentQuestion = unansweredQuestions[currentTextQuestionIndex]
    const answerText = answers[currentQuestion?.id]

    if (!answerText || answerText.trim() === "") {
      toast.error("Please provide an answer before saving")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerText,
          answeredBy: userId,
          method: "text",
        }),
      })

      if (!response.ok) throw new Error("Failed to save answer")

      toast.success("Answer saved successfully!")

      await fetchIncident()

      setAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[currentQuestion.id]
        return newAnswers
      })

      const remainingQuestions = incident.questions.filter((q) => !q.answer && q.id !== currentQuestion.id)
      if (remainingQuestions.length > 0) {
        setCurrentTextQuestionIndex(0)
      } else {
        toast.success("All questions answered! Great job!")
      }
    } catch (error) {
      console.error("[v0] Error saving progress:", error)
      toast.error("Failed to save your answer")
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

  const stopSpeaking = () => {
    if (synthesis) {
      synthesis.cancel()
      setIsSpeaking(false)
      toast.info("Speech stopped")
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [intelligenceMessages, isIntelligenceLoading])

  useEffect(() => {
    if (!incident?.id) {
      setReportCard(null)
      return
    }

    let cancelled = false
    const fetchReportCard = async () => {
      try {
        setReportCardLoading(true)
        setReportCardError(null)
        const response = await fetch(`/api/incidents/${incident.id}/report-card`)
        if (!response.ok) {
          throw new Error(`Failed to load report card (${response.status})`)
        }
        const data = await response.json()
        if (!cancelled) {
          setReportCard(data)
          setShowDetailedReport(false)
          setExpandedSections({ strengths: true, gaps: true, narrative: false })
        }
      } catch (error) {
        console.error("[staff incident] report card fetch failed", error)
        if (!cancelled) {
          setReportCardError("Unable to load report card.")
          setReportCard(null)
        }
      } finally {
        if (!cancelled) {
          setReportCardLoading(false)
        }
      }
    }

    fetchReportCard()

    return () => {
      cancelled = true
    }
  }, [incident?.id])

  const unansweredQuestions = incident?.questions.filter((q) => !q.answer) || []
  const answeredQuestions = incident?.questions.filter((q) => q.answer) || []

  const filteredEmployees = staffList.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()),
  )

  const enhancedNarrativeHtml = renderMarkdownOrHtml(incident?.initialReport?.enhancedNarrative)
  const aggregatedNarrative = useMemo(
    () => (incident ? buildIncidentCombinedNarrative(incident) : ""),
    [incident],
  )

  const aggregatedNarrativeHtml =
    aggregatedNarrative
      ? renderMarkdownOrHtml(aggregatedNarrative) || fallbackParagraphHtml(aggregatedNarrative)
      : null

  const hasOriginalNarrative = Boolean(aggregatedNarrativeHtml)

  const initialNarrativeRaw = incident?.initialReport?.narrative ?? incident?.description ?? ""
  const initialNarrative = initialNarrativeRaw.trim()
  const residentStateRaw = incident?.initialReport?.residentState?.trim()
  const environmentNotesRaw = incident?.initialReport?.environmentNotes?.trim()

  const narrativeHtml =
    enhancedNarrativeHtml ??
    aggregatedNarrativeHtml ??
    (initialNarrative ? fallbackParagraphHtml(initialNarrative) : "<p>No narrative provided.</p>")

  const residentStateHtml =
    renderMarkdownOrHtml(incident?.initialReport?.residentState) ||
    (incident?.initialReport?.residentState ? fallbackParagraphHtml(incident.initialReport.residentState) : null)
  const environmentNotesHtml =
    renderMarkdownOrHtml(incident?.initialReport?.environmentNotes) ||
    (incident?.initialReport?.environmentNotes ? fallbackParagraphHtml(incident.initialReport.environmentNotes) : null)

  const aiSummaryHtml =
    renderMarkdownOrHtml(incident?.aiReport?.summary) ||
    (incident?.aiReport?.summary ? fallbackParagraphHtml(incident.aiReport.summary) : null)

  const aiInsightsHtml =
    renderMarkdownOrHtml(incident?.aiReport?.insights) ||
    (incident?.aiReport?.insights ? fallbackParagraphHtml(incident.aiReport.insights) : null)

  const aiRecommendationsHtml =
    renderMarkdownOrHtml(incident?.aiReport?.recommendations) ||
    (incident?.aiReport?.recommendations
      ? fallbackParagraphHtml(incident.aiReport.recommendations)
      : null)

  const aiActionsHtml =
    renderMarkdownOrHtml(incident?.aiReport?.actions) ||
    (incident?.aiReport?.actions ? fallbackParagraphHtml(incident.aiReport.actions) : null)

  const quickCritique = useMemo(() => {
    if (!reportCard) return null
    return buildQuickCritique(reportCard)
  }, [reportCard])

  useEffect(() => {
    if (answeredQuestions.length === 0) {
      setCurrentAnsweredQuestionTab(0)
      return
    }
    setCurrentAnsweredQuestionTab((prev) => Math.min(prev, answeredQuestions.length - 1))
  }, [answeredQuestions])

  const toggleDetailSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  // Mock AI Content function - This is where the original issue was.
  // It should return an object or null, not be a function that returns an object or null.
  const getAIContent = (incidentId: string) => {
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

  const aiContent = incident ? getAIContent(incident.id) : null

  const currentAnsweredQuestion = answeredQuestions[currentAnsweredQuestionTab]
  const currentAnsweredAnsweredAt = useMemo(() => {
    if (!currentAnsweredQuestion?.answer?.answeredAt) return "Unknown time"
    return new Date(currentAnsweredQuestion.answer.answeredAt).toLocaleString()
  }, [currentAnsweredQuestion])

  const handleToggleReportCard = useCallback(() => {
    setShowReportCard((prev) => {
      const next = !prev
      if (!next) {
        setShowDetailedReport(false)
      }
      return next
    })
  }, [setShowDetailedReport])

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
              <Brain className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Intelligence</span>
              <span className="sm:hidden">Intel</span>
            </TabsTrigger>
            <TabsTrigger value="waik" className="data-[state=active]:bg-white">
              <Target className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">WAiK Agent</span>
              <span className="sm:hidden">WAiK</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview tab - Show enhanced narrative in overview (like admin page) */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      {incident?.title}
                    </CardTitle>
                    <div className="space-y-3">
                      {enhancedNarrativeHtml && (
                        <Badge variant="secondary" className="w-fit uppercase tracking-wide text-[10px]">
                          AI-enhanced summary
                        </Badge>
                      )}
                      <div
                        className="text-sm leading-relaxed text-muted-foreground incident-enhanced-html"
                        dangerouslySetInnerHTML={{ __html: narrativeHtml }}
                      />
                      {hasOriginalNarrative && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 text-xs text-primary hover:text-primary"
                          onClick={() => setShowOriginalNarrative((prev) => !prev)}
                        >
                          {showOriginalNarrative ? "Hide original voice narrative" : "Show original voice narrative"}
                        </Button>
                      )}
                    </div>
                    {showOriginalNarrative && hasOriginalNarrative && (
                      <div className="mt-4 rounded-lg border border-muted bg-muted/40 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Original voice narrative
                        </p>
                        <div
                          className="text-sm leading-relaxed text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: aggregatedNarrativeHtml ?? "<p>No narrative provided.</p>" }}
                        />
                      </div>
                    )}
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
                    <p className="text-xs text-muted-foreground mb-1">Reported By</p>
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

            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg text-primary">Investigative Highlights</CardTitle>
                  <CardDescription>
                    Notes captured during follow-up along with resident state and environment observations
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs text-primary hover:text-primary"
                  onClick={() => setShowInvestigativeHighlights((prev) => !prev)}
                >
                  {showInvestigativeHighlights ? "Hide" : "Show"}
                </Button>
              </CardHeader>
              {showInvestigativeHighlights && (
                <CardContent className="space-y-4">
                  {(residentStateHtml || environmentNotesHtml) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {residentStateHtml && (
                        <div className="rounded-lg border border-muted/40 bg-muted/30 p-4 space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Resident state</p>
                          <div
                            className="text-sm leading-relaxed text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: residentStateHtml ?? "" }}
                          />
                        </div>
                      )}
                      {environmentNotesHtml && (
                        <div className="rounded-lg border border-muted/40 bg-muted/30 p-4 space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Environment notes</p>
                          <div
                            className="text-sm leading-relaxed text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: environmentNotesHtml ?? "" }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {answeredQuestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Answer highlights</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {answeredQuestions.slice(0, 3).map((q) => (
                          <li key={`qa-highlight-${q.id}`} className="border border-muted/40 rounded-lg p-3 bg-muted/20">
                            <p className="font-medium">{q.questionText}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {q.answer?.answerText ?? "No answer captured."}
                            </p>
                          </li>
                        ))}
                      </ul>
                      {answeredQuestions.length > 3 ? (
                        <p className="text-xs text-muted-foreground">
                          There are {answeredQuestions.length - 3} additional answered questions in the Q&A tab.
                        </p>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-3">
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Report Card
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Generated from the narrative and follow-up answers captured for this incident
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs text-primary hover:text-primary"
                  onClick={handleToggleReportCard}
                >
                  {showReportCard ? "Hide" : "Show"}
                </Button>
              </CardHeader>
              {showReportCard && (
                <CardContent className="space-y-5">
                  {reportCardLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Scoring narrative…</span>
                      </div>
                    </div>
                  ) : reportCard ? (
                    <div className="space-y-5">
                      <div className="text-center space-y-2">
                        <div className="text-5xl font-bold text-primary">{formatScore(reportCard.score)}/10</div>
                        <p className="text-sm text-muted-foreground">Overall quality score</p>
                        <p className="text-xs text-muted-foreground">
                          Completeness {formatScore(reportCard.completenessScore)}/10
                        </p>
                      </div>

                      {quickCritique ? (
                        <div className="rounded-md bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
                          <p>
                            <span className="font-semibold text-emerald-700">What went well:</span> {quickCritique.strengthsSnippet}
                          </p>
                          <p>
                            <span className="font-semibold text-amber-700">Needs attention:</span> {quickCritique.gapsSnippet}
                          </p>
                          {quickCritique.adviceSnippet ? (
                            <p>
                              <span className="font-semibold text-sky-700">Advice:</span> {quickCritique.adviceSnippet}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full border border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => setShowDetailedReport((prev) => !prev)}
                        >
                          {showDetailedReport ? "Hide Detailed Report Card" : "Show Detailed Report Card"}
                        </Button>

                        {showDetailedReport ? (
                          <div className="space-y-4">
                            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-primary"
                                onClick={() => toggleDetailSection("strengths")}
                              >
                                <span>What You Did Well</span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${expandedSections.strengths ? "rotate-180" : ""}`}
                                />
                              </button>
                              {expandedSections.strengths ? (
                                <div className="border-t border-primary/20 px-4 py-3 text-sm text-muted-foreground">
                                  {reportCard.strengths.length > 0 ? (
                                    <ul className="space-y-2">
                                      {reportCard.strengths.map((item, index) => (
                                        <li key={`strength-${index}`} className="flex gap-2">
                                          <span className="text-emerald-500 shrink-0">[+]</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>No specific strengths identified yet.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-amber-200/40 bg-amber-50">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-amber-700"
                                onClick={() => toggleDetailSection("gaps")}
                              >
                                <span>What Needs Work</span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${expandedSections.gaps ? "rotate-180" : ""}`}
                                />
                              </button>
                              {expandedSections.gaps ? (
                                <div className="border-t border-amber-200/40 px-4 py-3 text-sm text-slate-700">
                                  {reportCard.gaps.length > 0 ? (
                                    <ul className="space-y-2">
                                      {reportCard.gaps.map((item, index) => (
                                        <li key={`gap-${index}`} className="flex gap-2">
                                          <span className="text-amber-500 shrink-0">[!]</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>No major gaps flagged—keep this level of detail.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-sky-200/40 bg-sky-50">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-sky-700"
                                onClick={() => toggleDetailSection("narrative")}
                              >
                                <span>See Original Narrative</span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${expandedSections.narrative ? "rotate-180" : ""}`}
                                />
                              </button>
                              {expandedSections.narrative ? (
                                <div className="border-t border-sky-200/40 px-4 py-3 text-sm text-slate-700 whitespace-pre-line">
                                  {aggregatedNarrativeHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: aggregatedNarrativeHtml }} />
                                  ) : (
                                    <p>No narrative captured for this incident.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : reportCardError ? (
                    <div className="text-sm text-destructive">{reportCardError}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No narrative captured yet.</div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Q&A content is now located in the dedicated Q&A tab below */}

          </TabsContent>

          <TabsContent value="qa" className="space-y-6 mt-6">
            {unansweredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-accent/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-accent">
                        Pending Questions ({unansweredQuestions.length})
                      </CardTitle>
                      <CardDescription>Answer questions assigned to you using text or voice</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={qaMode === "text" ? "default" : "outline"} size="sm" onClick={() => setQaMode("text")}>
                        <Type className="h-4 w-4 mr-2" />
                        Text
                      </Button>
                      <Button
                        variant={qaMode === "voice" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setQaMode("voice")
                          handleStartVoiceMode()
                        }}
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Voice
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {qaMode === "text" ? (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        {unansweredQuestions.map((q, idx) => (
                          <button
                            key={q.id}
                            onClick={() => setCurrentTextQuestionIndex(idx)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all ${
                              idx === currentTextQuestionIndex
                                ? "bg-accent text-accent-foreground shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="font-medium">Q{idx + 1}</span>
                          </button>
                        ))}
                      </div>

                      <div className="p-6 border-2 border-accent/20 rounded-lg bg-accent/5">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-lg leading-relaxed">
                              {unansweredQuestions[currentTextQuestionIndex]?.questionText}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-muted-foreground">
                                Asked by <span className="font-medium">{unansweredQuestions[currentTextQuestionIndex]?.askedBy}</span>
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(unansweredQuestions[currentTextQuestionIndex]?.askedAt, "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="answer-input">Your Answer</Label>
                        <Textarea
                          id="answer-input"
                          placeholder="Type your answer here..."
                          value={answers[unansweredQuestions[currentTextQuestionIndex]?.id] || ""}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [unansweredQuestions[currentTextQuestionIndex]?.id]: e.target.value,
                            })
                          }
                          rows={5}
                        />
                      </div>

                      <Button onClick={handleSaveProgress} disabled={saving} className="w-full">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Save Answer
                          </>
                        )}
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setCurrentTextQuestionIndex(Math.max(0, currentTextQuestionIndex - 1))}
                          disabled={currentTextQuestionIndex === 0}
                          variant="outline"
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          onClick={() =>
                            setCurrentTextQuestionIndex(
                              Math.min(unansweredQuestions.length - 1, currentTextQuestionIndex + 1),
                            )
                          }
                          disabled={currentTextQuestionIndex === unansweredQuestions.length - 1}
                          variant="outline"
                          className="flex-1"
                        >
                          Next
                          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        {unansweredQuestions.map((q, idx) => (
                          <button
                            key={q.id}
                            onClick={() => {
                              setCurrentQuestionIndex(idx)
                              setCurrentTranscript("")
                              setIsEditingTranscript(false)
                              setTimeout(() => speakQuestion(q.questionText), 300)
                            }}
                            className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all ${
                              idx === currentQuestionIndex
                                ? "bg-accent text-accent-foreground shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="font-medium">Q{idx + 1}</span>
                          </button>
                        ))}
                      </div>

                      <div className="p-6 border-2 border-accent/20 rounded-lg bg-accent/5">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-lg leading-relaxed">
                              {unansweredQuestions[currentQuestionIndex]?.questionText}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-muted-foreground">
                                Asked by <span className="font-medium">{unansweredQuestions[currentQuestionIndex]?.askedBy}</span>
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(unansweredQuestions[currentQuestionIndex]?.askedAt, "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-4 py-8">
                        <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                          {isRecording ? (
                            <Mic className="h-10 w-10 text-accent animate-pulse" />
                          ) : isSpeaking ? (
                            <Volume2 className="h-10 w-10 text-accent animate-pulse" />
                          ) : (
                            <Mic className="h-10 w-10 text-accent" />
                          )}
                        </div>

                        <div>
                          <p className="text-lg font-semibold mb-2">
                            Question {currentQuestionIndex + 1} of {unansweredQuestions.length}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isSpeaking
                              ? "Listening to question..."
                              : isRecording
                                ? "Recording your answer..."
                                : "Ready to answer"}
                          </p>
                        </div>

                        {isEditingTranscript && (
                          <Card className="border-primary/20">
                            <CardContent className="pt-6">
                              <Label htmlFor="transcript-edit">Review and edit your answer</Label>
                              <Textarea
                                id="transcript-edit"
                                value={currentTranscript}
                                onChange={(e) => setCurrentTranscript(e.target.value)}
                                rows={5}
                                className="mt-2"
                              />
                              <div className="flex gap-2 mt-4">
                                <Button onClick={handleSaveCurrentAnswer} disabled={saving} className="flex-1">
                                  {saving ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Save Answer
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCurrentTranscript("")
                                    setIsEditingTranscript(false)
                                    setTimeout(() => speakQuestion(unansweredQuestions[currentQuestionIndex].questionText), 300)
                                  }}
                                  variant="outline"
                                >
                                  Re-record
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {!isEditingTranscript && (
                          <div className="flex gap-2 justify-center">
                            {isRecording ? (
                              <Button onClick={stopRecording} variant="destructive" size="lg">
                                <MicOff className="mr-2 h-5 w-5" />
                                Stop Recording
                              </Button>
                            ) : (
                              <Button onClick={startRecording} size="lg" disabled={isSpeaking}>
                                <Mic className="mr-2 h-5 w-5" />
                                Start Recording
                              </Button>
                            )}
                            <Button onClick={() => setQaMode("text")} variant="outline" size="lg">
                              Switch to Text
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {answeredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">
                    Answered Questions ({answeredQuestions.length})
                  </CardTitle>
                  <CardDescription>Questions that have been responded to - Navigate using tabs below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {answeredQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentAnsweredQuestionTab(idx)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all ${
                          idx === currentAnsweredQuestionTab
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">Q{idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 border-2 border-primary/20 rounded-lg bg-primary/5">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          Q
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-lg leading-relaxed">
                            {answeredQuestions[currentAnsweredQuestionTab]?.questionText}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-muted-foreground">
                              Asked by <span className="font-medium">{answeredQuestions[currentAnsweredQuestionTab]?.askedBy}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(
                                answeredQuestions[currentAnsweredQuestionTab]?.askedAt,
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-2 border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-primary mt-1">A</Badge>
                        <div className="flex-1">
                          <p className="text-lg leading-relaxed">
                            {answeredQuestions[currentAnsweredQuestionTab]?.answer?.answerText}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-muted-foreground">
                              Answered by <span className="font-medium">{answeredQuestions[currentAnsweredQuestionTab]?.answer?.answeredBy}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(
                                answeredQuestions[currentAnsweredQuestionTab]?.answer?.answeredAt,
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {answeredQuestions[currentAnsweredQuestionTab]?.answer?.method === "voice" ? (
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

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentAnsweredQuestionTab(Math.max(0, currentAnsweredQuestionTab - 1))}
                      disabled={currentAnsweredQuestionTab === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentAnsweredQuestionTab(
                          Math.min(answeredQuestions.length - 1, currentAnsweredQuestionTab + 1),
                        )
                      }
                      disabled={currentAnsweredQuestionTab === answeredQuestions.length - 1}
                      variant="outline"
                      className="flex-1"
                    >
                      Next
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {unansweredQuestions.length === 0 && answeredQuestions.length === 0 && (
              <Card className="bg-white shadow-lg">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No questions for this incident</p>
                  <p className="text-sm text-muted-foreground">
                    Questions will appear here when an admin sends follow-up questions.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Intelligence tab - unchanged */}
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
                  <div className="flex items-center gap-2">
                    {isSpeaking && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopSpeaking}
                        className="flex items-center gap-1.5 flex-shrink-0 h-9 px-3 animate-pulse"
                      >
                        <MicOff className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Stop</span>
                      </Button>
                    )}
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
                              className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${
                                message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
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
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:-0.3s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:-0.15s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
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

          {/* WAiK Agent Tab */}
          <TabsContent value="waik" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Target className="h-5 w-5 text-primary" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <CardTitle className="text-base sm:text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent truncate">
                    WAiK Intelligence
                  </CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  WAiK summaries, insights, recommendations, and action items
                </CardDescription>
              </CardHeader>
            </Card>

            {incident?.aiReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">WAiK Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm leading-relaxed space-y-2 incident-enhanced-html"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownOrHtml(incident.aiReport.summary || "") || "" }}
                    />
                  </CardContent>
                </Card>

                <Card className="border-purple-200 lg:col-span-2 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">WAiK Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm leading-relaxed space-y-2 incident-enhanced-html"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownOrHtml(incident.aiReport.insights || "") || "" }}
                    />
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">WAiK Recommendations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm leading-relaxed space-y-2 incident-enhanced-html"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownOrHtml(incident.aiReport.recommendations || "") || "" }}
                    />
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">WAiK Recommended Action Items</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm leading-relaxed space-y-2 incident-enhanced-html"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownOrHtml(incident.aiReport.actions || "") || "" }}
                    />
                  </CardContent>
                </Card>

                <Card className="border-purple-100 bg-purple-50/50 lg:col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-purple-600" />
                        <span>Model: {incident.aiReport.model}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>Confidence: {(incident.aiReport.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Generated: {formatDate(incident.aiReport.generatedAt, "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      {incident.aiReport.promptTokens && incident.aiReport.completionTokens && (
                        <div className="flex items-center gap-2">
                          <span>
                            Tokens: {incident.aiReport.promptTokens + incident.aiReport.completionTokens} total
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-blue-50/30">
                <CardContent className="py-12 text-center">
                  <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2 text-purple-900">WAiK Analysis Pending</p>
                  <p className="text-sm text-purple-700/70">
                    The WAiK AI analysis will be available once generated by an administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}