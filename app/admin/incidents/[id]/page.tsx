"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Incident, User as Staff } from "@/lib/types"
import { format, isValid, parseISO } from "date-fns"
import { useAuthStore } from "@/lib/auth-store"
import {
  ArrowLeft,
  Send,
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  MessageSquare,
  FileText,
  Mic,
  Trash2,
  UserPlus,
  Volume2,
  Loader2,
  MicOff,
  Edit2,
  Save,
  X,
  CheckCircle,
  Lock,
  CheckCircle2,
  Type,
} from "lucide-react"
import { toast } from "sonner"
import { getDisplayNarrative } from "@/lib/utils/enhance-narrative"
import { markdownTohtml } from "@/lib/utils/markdown-to-html"

function formatDate(dateString: string | undefined, formatString: string): string {
  if (!dateString) return "Invalid date"

  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return "Invalid date"
    return format(date, formatString)
  } catch (error) {
    console.error("[v0] Date formatting error:", error, "for date:", dateString)
    return "Invalid date"
  }
}

type IntelligenceMessage = {
  id: string
  type: "user" | "ai"
  text: string
  timestamp: Date
}

export default function AdminIncidentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { userId, role } = useAuthStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const [isEditingIncident, setIsEditingIncident] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [editedResidentName, setEditedResidentName] = useState("")
  const [editedResidentRoom, setEditedResidentRoom] = useState("")
  const [isSavingIncident, setIsSavingIncident] = useState(false)
  const [isClosingIncident, setIsClosingIncident] = useState(false)

  const [isEditingHumanReport, setIsEditingHumanReport] = useState(false)
  const [humanReportSummary, setHumanReportSummary] = useState("")
  const [humanReportInsights, setHumanReportInsights] = useState("")
  const [humanReportRecommendations, setHumanReportRecommendations] = useState("")
  const [humanReportActions, setHumanReportActions] = useState("")
  const [isSavingHumanReport, setIsSavingHumanReport] = useState(false)

  const [isGeneratingAIReport, setIsGeneratingAIReport] = useState(false)

  const [newQuestion, setNewQuestion] = useState("")
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])

  const [intelligenceMessages, setIntelligenceMessages] = useState<IntelligenceMessage[]>([])
  const [intelligenceInput, setIntelligenceInput] = useState("")
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const [currentPendingQuestionTab, setCurrentPendingQuestionTab] = useState(0)
  const [currentAnsweredQuestionTab, setCurrentAnsweredQuestionTab] = useState(0)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("")

  useEffect(() => {
    fetchIncident()
    fetchStaffList()
  }, [params.id])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setIncident(data)
        setEditedTitle(data.title)
        setEditedDescription(getDisplayNarrative(data))
        setEditedResidentName(data.residentName)
        setEditedResidentRoom(data.residentRoom)

        if (data.humanReport) {
          setHumanReportSummary(data.humanReport.summary)
          setHumanReportInsights(data.humanReport.insights)
          setHumanReportRecommendations(data.humanReport.recommendations)
          setHumanReportActions(data.humanReport.actions)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching incident:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStaffList = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const users = await response.json()
        setStaffList(users)
      }
    } catch (error) {
      console.error("[v0] Error fetching staff list:", error)
    }
  }

  const handleSaveIncidentEdits = async () => {
    if (!incident) return

    setIsSavingIncident(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          description: editedDescription,
          residentName: editedResidentName,
          residentRoom: editedResidentRoom,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setIncident(updated)
        setIsEditingIncident(false)
        toast.success("Incident details updated successfully")
      } else {
        toast.error("Failed to update incident details")
      }
    } catch (error) {
      console.error("[v0] Error updating incident:", error)
      toast.error("Failed to update incident details")
    } finally {
      setIsSavingIncident(false)
    }
  }

  const handleCloseIncident = async () => {
    if (!incident) return

    setIsClosingIncident(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      })

      if (response.ok) {
        const updated = await response.json()
        setIncident(updated)
        toast.success("Incident closed successfully")
      } else {
        toast.error("Failed to close incident")
      }
    } catch (error) {
      console.error("[v0] Error closing incident:", error)
      toast.error("Failed to close incident")
    } finally {
      setIsClosingIncident(false)
    }
  }

  const handleSaveHumanReport = async () => {
    if (!incident || !userId) return

    setIsSavingHumanReport(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}/human-report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: humanReportSummary,
          insights: humanReportInsights,
          recommendations: humanReportRecommendations,
          actions: humanReportActions,
          userId,
        }),
      })

      if (response.ok) {
        await fetchIncident()
        setIsEditingHumanReport(false)
        toast.success("Insights saved successfully")
      } else {
        toast.error("Failed to save insights")
      }
    } catch (error) {
      console.error("[v0] Error saving human report:", error)
      toast.error("Failed to save insights")
    } finally {
      setIsSavingHumanReport(false)
    }
  }

  const handleGenerateAIReport = async () => {
    if (!incident) return

    const answeredQuestions = incident.questions.filter((q) => q.answer)
    if (answeredQuestions.length < 5) {
      toast.error(
        `Need at least 5 answered questions to generate AI insights. Currently have ${answeredQuestions.length}.`,
      )
      return
    }

    setIsGeneratingAIReport(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}/ai-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        await fetchIncident()
        toast.success("WAiK AI insights generated successfully!")
        setActiveTab("waik")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to generate AI insights")
      }
    } catch (error) {
      console.error("[v0] Error generating AI report:", error)
      toast.error("Failed to generate AI insights")
    } finally {
      setIsGeneratingAIReport(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!incident) return
    try {
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const updated = await response.json()
        setIncident(updated)
        toast.success("Status updated successfully")
      }
    } catch (error) {
      console.error("[v0] Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  const updatePriority = async (priority: string) => {
    if (!incident) return
    try {
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      })

      if (response.ok) {
        const updated = await response.json()
        setIncident(updated)
        toast.success("Priority updated successfully")
      }
    } catch (error) {
      console.error("[v0] Error updating priority:", error)
      toast.error("Failed to update priority")
    }
  }

  const sendQuestion = async () => {
    if (!newQuestion.trim()) return

    setIsAddingQuestion(true)
    try {
      const response = await fetch(`/api/incidents/${params.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: newQuestion,
          askedBy: "Admin User",
          assignedTo: selectedStaff.length > 0 ? selectedStaff : undefined,
        }),
      })

      if (response.ok) {
        toast.success("Question sent to staff")
        setNewQuestion("")
        setSelectedStaff([])
        fetchIncident()
      } else {
        toast.error("Failed to send question")
      }
    } catch (error) {
      console.error("[v0] Error sending question:", error)
      toast.error("Failed to send question")
    } finally {
      setIsAddingQuestion(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/incidents/${params.id}/questions/${questionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Question deleted")
        fetchIncident()
      } else {
        toast.error("Failed to delete question")
      }
    } catch (error) {
      console.error("[v0] Error deleting question:", error)
      toast.error("Failed to delete question")
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const aiMessage: IntelligenceMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        text: data.answer,
        timestamp: new Date(),
      }

      setIntelligenceMessages((prev) => [...prev, aiMessage])

      if (autoSpeak) {
        speakText(data.answer)
      }
    } catch (error) {
      console.error("[v0] Error getting intelligence response:", error)
      toast.error("Failed to get response. Please try again.")
      const errorMessage: IntelligenceMessage = {
        id: `ai-error-${Date.now()}`,
        type: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setIntelligenceMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsIntelligenceLoading(false)
    }
  }

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported in your browser.")
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (event) => {
      console.error("[v0] Speech synthesis error:", event)
      setIsSpeaking(false)
      toast.error("Speech synthesis failed.")
    }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      toast.info("Speech stopped")
    }
  }

  const startVoiceRecording = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setIntelligenceInput(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      setIsListening(false)
      toast.error("Voice recognition failed. Please try again.")
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      console.error("[v0] Error starting recognition:", error)
      setIsListening(false)
      toast.error("Failed to start voice recognition. Please try again.")
    }
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [intelligenceMessages, isIntelligenceLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading incident details...</p>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Incident not found</p>
      </div>
    )
  }

  console.log("[v0] Auth Store Values:", {
    userId,
    role,
    roleType: typeof role,
    isAdmin: role === "admin",
  })

  const answeredQuestions = incident.questions.filter((q) => q.answer)
  const unansweredQuestions = incident.questions.filter((q) => !q.answer)
  const canGenerateAIReport = answeredQuestions.length >= 5

  console.log("[v0] WAiK Agent Debug Info:", {
    role,
    answeredQuestionsCount: answeredQuestions.length,
    canGenerateAIReport,
    hasAIReport: !!incident?.aiReport,
    isGeneratingAIReport,
    shouldShowButton: role === "admin",
  })

  const filteredEmployees = staffList.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()),
  )

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/dashboard")} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <TabsTrigger value="waik" className="data-[state=active]:bg-white">
              <Brain className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">WAiK Agent</span>
              <span className="sm:hidden">WAiK</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {isEditingIncident ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="title">Incident Title</Label>
                          <Input
                            id="title"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="text-lg font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="residentName">Resident Name</Label>
                            <Input
                              id="residentName"
                              value={editedResidentName}
                              onChange={(e) => setEditedResidentName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="residentRoom">Room Number</Label>
                            <Input
                              id="residentRoom"
                              value={editedResidentRoom}
                              onChange={(e) => setEditedResidentRoom(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveIncidentEdits} disabled={isSavingIncident} size="sm">
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingIncident ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditingIncident(false)
                              setEditedTitle(incident.title)
                              setEditedDescription(incident.description)
                              setEditedResidentName(incident.residentName)
                              setEditedResidentRoom(incident.residentRoom)
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                            {incident.title}
                          </CardTitle>
                          {role === "admin" && (
                            <Button onClick={() => setIsEditingIncident(true)} variant="outline" size="sm">
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resident</p>
                    <p className="font-medium">
                      {incident.residentName}{" "}
                      <span className="text-muted-foreground">(Room {incident.residentRoom})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reported By</p>
                    <p className="font-medium">{incident.staffName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="font-medium">{formatDate(incident.createdAt, "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-medium">{formatDate(incident.updatedAt, "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </CardHeader>
              {!isEditingIncident && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Incident Narrative
                      </h3>
                      {incident.initialReport?.enhancedNarrative ? (
                        <>
                          <Badge variant="secondary" className="mb-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI-Enhanced
                          </Badge>
                          <div
                            className="text-sm leading-relaxed text-foreground incident-enhanced-html"
                            dangerouslySetInnerHTML={{
                              __html: markdownTohtml(incident.initialReport.enhancedNarrative),
                            }}
                          />
                        </>
                      ) : (
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                          {incident.initialReport?.narrative || incident.description || "No narrative provided."}
                        </p>
                      )}
                    </div>

                    {incident.initialReport?.narrative &&
                      incident.initialReport?.enhancedNarrative &&
                      incident.initialReport.narrative !== incident.initialReport.enhancedNarrative && (
                        <details className="mt-4">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            View original voice transcript
                          </summary>
                          <div className="mt-2 p-3 bg-muted/40 rounded-md border border-muted">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              Original Transcript
                            </p>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                              {incident.initialReport.narrative}
                            </p>
                          </div>
                        </details>
                      )}

                    {(incident.initialReport?.residentState || incident.initialReport?.environmentNotes) && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {incident.initialReport.residentState && (
                          <div className="p-3 bg-muted/40 rounded-md border border-muted">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Resident State</p>
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                              {incident.initialReport.residentState}
                            </p>
                          </div>
                        )}
                        {incident.initialReport.environmentNotes && (
                          <div className="p-3 bg-muted/40 rounded-md border border-muted">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              Environment Notes
                            </p>
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                              {incident.initialReport.environmentNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={incident.status} onValueChange={updateStatus} disabled={incident.status === "closed"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="pending-review">Pending Review</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={incident.priority}
                    onValueChange={updatePriority}
                    disabled={incident.status === "closed"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {role === "admin" && incident.status !== "closed" && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-5 w-5 text-destructive" />
                    Close Incident
                  </CardTitle>
                  <CardDescription>
                    Closing this incident will finalize all details and prevent further edits. This action is permanent.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleCloseIncident}
                    disabled={isClosingIncident}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isClosingIncident ? "Closing..." : "Close Incident"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="qa" className="space-y-6 mt-6">
            {answeredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">
                    Answered Questions ({answeredQuestions.length})
                  </CardTitle>
                  <CardDescription>Questions that have been responded to - Navigate using tabs below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Navigation Tabs */}
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

                  {/* Current Question & Answer Display */}
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
                              Asked by{" "}
                              <span className="font-medium">
                                {answeredQuestions[currentAnsweredQuestionTab]?.askedBy}
                              </span>
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
                              Answered by{" "}
                              <span className="font-medium">
                                {answeredQuestions[currentAnsweredQuestionTab]?.answer?.answeredBy}
                              </span>
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

                  {/* Navigation Buttons */}
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

            {unansweredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-accent/40">
                <CardHeader>
                  <CardTitle className="text-lg text-accent">
                    Pending Questions ({unansweredQuestions.length})
                  </CardTitle>
                  <CardDescription>Questions awaiting response - Navigate using tabs below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Navigation Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {unansweredQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentPendingQuestionTab(idx)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all ${
                          idx === currentPendingQuestionTab
                            ? "bg-accent text-accent-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="font-medium">Q{idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  {/* Current Question Display */}
                  <div className="p-6 border-2 border-accent/20 rounded-lg bg-accent/5">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-lg leading-relaxed">
                          {unansweredQuestions[currentPendingQuestionTab]?.questionText}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Asked by{" "}
                            <span className="font-medium">
                              {unansweredQuestions[currentPendingQuestionTab]?.askedBy}
                            </span>
                          </p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(
                              unansweredQuestions[currentPendingQuestionTab]?.askedAt,
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </p>
                        </div>
                        {unansweredQuestions[currentPendingQuestionTab]?.assignedTo &&
                          unansweredQuestions[currentPendingQuestionTab].assignedTo!.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <UserPlus className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                Assigned to:{" "}
                                {unansweredQuestions[currentPendingQuestionTab]
                                  .assignedTo!.map((empId) => {
                                    const emp = staffList.find((s) => s.id === empId)
                                    return emp?.name || empId
                                  })
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteQuestion(unansweredQuestions[currentPendingQuestionTab].id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Assign to Employee(s)</Label>
                    </div>

                    {/* Search Input */}
                    <Input
                      placeholder="Start typing a name..."
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      className="w-full"
                    />

                    {/* Employee Selection */}
                    {employeeSearchQuery && (
                      <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                        {filteredEmployees.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No employees found</p>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <div key={emp.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={emp.id}
                                checked={selectedEmployees.includes(emp.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEmployees([...selectedEmployees, emp.id])
                                  } else {
                                    setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={emp.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                              >
                                {emp.name}
                                <Badge variant="outline" className="text-xs">
                                  {emp.role}
                                </Badge>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Employees Display */}
                    {selectedEmployees.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployees.map((empId) => {
                          const emp = staffList.find((s) => s.id === empId)
                          return (
                            <Badge key={empId} variant="secondary" className="flex items-center gap-1">
                              {emp?.name}
                              <button
                                onClick={() => setSelectedEmployees(selectedEmployees.filter((id) => id !== empId))}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      onClick={() => handleAssignQuestion(unansweredQuestions[currentPendingQuestionTab].id)}
                      disabled={selectedEmployees.length === 0}
                      size="sm"
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
                    </Button>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPendingQuestionTab(Math.max(0, currentPendingQuestionTab - 1))}
                      disabled={currentPendingQuestionTab === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPendingQuestionTab(
                          Math.min(unansweredQuestions.length - 1, currentPendingQuestionTab + 1),
                        )
                      }
                      disabled={currentPendingQuestionTab === unansweredQuestions.length - 1}
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

            {/* No questions message */}
            {unansweredQuestions.length === 0 && answeredQuestions.length === 0 && (
              <Card className="bg-white shadow-lg">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No questions for this incident</p>
                  <p className="text-sm text-muted-foreground">
                    You can send follow-up questions to staff using the form below.
                  </p>
                </CardContent>
              </Card>
            )}

            <Separator className="my-4" />

            {/* START OF UPDATED SECTION */}
            <Card className="border-accent/20 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-accent">Send New Question to Staff</CardTitle>
                <CardDescription>Ask staff for additional information about this incident</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-question">Question</Label>
                  <Textarea
                    id="new-question"
                    placeholder="Type your question here..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Employee Assignment Section - Same UI as Pending Questions */}
                <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Assign to Employee(s) (Optional)</Label>
                  </div>

                  {/* Search Input */}
                  <Input
                    placeholder="Start typing a name..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full"
                  />

                  {/* Employee Selection */}
                  {employeeSearchQuery && (
                    <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                      {filteredEmployees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No employees found</p>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <div key={emp.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`new-q-${emp.id}`}
                              checked={selectedStaff.includes(emp.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStaff([...selectedStaff, emp.id])
                                } else {
                                  setSelectedStaff(selectedStaff.filter((id) => id !== emp.id))
                                }
                              }}
                            />
                            <label
                              htmlFor={`new-q-${emp.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              {emp.name}
                              <Badge variant="outline" className="text-xs">
                                {emp.role}
                              </Badge>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected Employees Display */}
                  {selectedStaff.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedStaff.map((empId) => {
                        const emp = staffList.find((s) => s.id === empId)
                        return (
                          <Badge key={empId} variant="secondary" className="flex items-center gap-1">
                            {emp?.name}
                            <button
                              onClick={() => setSelectedStaff(selectedStaff.filter((id) => id !== empId))}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Button
                  onClick={sendQuestion}
                  disabled={isAddingQuestion || !newQuestion.trim()}
                  className="w-full sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isAddingQuestion ? "Sending..." : "Send Question"}
                </Button>
              </CardContent>
            </Card>
            {/* END OF UPDATED SECTION */}
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
                        disabled={isIntelligenceLoading || isListening}
                        className="pr-10 h-10 sm:h-11 text-sm sm:text-base"
                      />
                      {isListening && (
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
                      variant={isListening ? "destructive" : "outline"}
                      onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                      disabled={isIntelligenceLoading}
                      className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11"
                    >
                      <Mic className={`h-4 w-4 sm:h-5 sm:w-5 ${isListening ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleIntelligenceSubmit}
                      disabled={!intelligenceInput.trim() || isIntelligenceLoading || isListening}
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

          <TabsContent value="waik" className="space-y-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  WAiK AI Agent
                </h2>
                <p className="text-sm text-muted-foreground mt-1">AI-powered analysis and recommendations</p>
              </div>
              {role === "admin" && (
                <Button
                  onClick={handleGenerateAIReport}
                  disabled={!canGenerateAIReport || isGeneratingAIReport || !!incident.aiReport}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 relative overflow-hidden group"
                >
                  {isGeneratingAIReport && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 animate-pulse opacity-50" />
                  )}
                  <span className="relative z-10 flex items-center">
                    {isGeneratingAIReport ? (
                      <>
                        <Brain className="mr-2 h-4 w-4 animate-pulse" />
                        Analyzing Incident...
                      </>
                    ) : incident.aiReport ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Regenerate Analysis
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                        Generate WAiK's Analysis
                      </>
                    )}
                  </span>
                </Button>
              )}
            </div>

            {isGeneratingAIReport && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 shadow-lg overflow-hidden">
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      {/* Animated gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 blur-3xl opacity-30 animate-pulse" />

                      {/* Pulsing brain icon */}
                      <div className="relative">
                        <Brain className="h-16 w-16 text-purple-600 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-50 blur-xl animate-ping" />
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        WAiK is analyzing the incident...
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Processing {answeredQuestions.length} answered questions and generating comprehensive insights
                      </p>
                    </div>

                    {/* Animated dots */}
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-3 w-3 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-3 w-3 rounded-full bg-cyan-600 animate-bounce" />
                    </div>

                    {/* Scanning effect */}
                    <div className="w-full max-w-md h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!canGenerateAIReport && !incident.aiReport && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Brain className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-900">More data needed</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        At least 5 answered questions are required to generate AI insights. Currently have{" "}
                        {answeredQuestions.length} answered question{answeredQuestions.length !== 1 ? "s" : ""}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {incident.aiReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">AI Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.aiReport.summary}</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 lg:col-span-2 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">AI Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.aiReport.insights}</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">AI Recommendations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.aiReport.recommendations}</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-base">AI Actions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.aiReport.actions}</p>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <CardTitle className="text-base text-muted-foreground">AI Summary</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>Awaiting AI generation</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 lg:col-span-2 bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-400" />
                        <CardTitle className="text-base text-muted-foreground">AI Insights</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>Awaiting AI generation</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-purple-400" />
                        <CardTitle className="text-base text-muted-foreground">AI Recommendations</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>Awaiting AI generation</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-400" />
                        <CardTitle className="text-base text-muted-foreground">AI Actions</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>Awaiting AI generation</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
