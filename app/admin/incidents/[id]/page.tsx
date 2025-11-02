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
import type { Incident, User as Staff } from "@/lib/types" // Renamed User to Staff
import { format, isValid, parseISO } from "date-fns"
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
} from "lucide-react"
import { toast } from "sonner"

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
  // Renamed function
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([]) // Changed type to Staff
  const [isLoading, setIsLoading] = useState(true) // Renamed loading to isLoading
  const [activeTab, setActiveTab] = useState("overview") // New state for active tab
  const [newQuestion, setNewQuestion] = useState("")
  const [isAddingQuestion, setIsAddingQuestion] = useState(false) // New state
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null) // New state
  const [answerText, setAnswerText] = useState("") // New state
  const [isSavingAnswer, setIsSavingAnswer] = useState(false) // New state
  const [intelligenceMessages, setIntelligenceMessages] = useState<IntelligenceMessage[]>([])
  const [intelligenceInput, setIntelligenceInput] = useState("")
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
  const [isListening, setIsListening] = useState(false) // Renamed isRecording to isListening
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]) // Declare selectedStaff
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const getAIContent = (incidentId: string) => {
    const savedContent = localStorage.getItem(`ai-content-${incidentId}`)
    if (savedContent) {
      try {
        // Assuming the stored data is { messages: IntelligenceMessage[] }
        const parsedData = JSON.parse(savedContent)
        // Ensure the parsed data has the expected structure
        if (parsedData && Array.isArray(parsedData.messages)) {
          // Map dates back if necessary, assuming they are stored as strings
          parsedData.messages = parsedData.messages.map((msg: IntelligenceMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          return parsedData
        }
      } catch (error) {
        console.error("[v0] Error parsing AI content from localStorage:", error)
        // Fallback to empty if parsing fails or data is malformed
        return { messages: [] }
      }
    }
    return { messages: [] }
  }

  const aiContent = getAIContent(params.id)

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
        // Load intelligence messages from localStorage on fetch
        const storedMessages = getAIContent(data.id)
        setIntelligenceMessages(storedMessages.messages)
      }
    } catch (error) {
      console.error("[v0] Error fetching incident:", error)
    } finally {
      setIsLoading(false) // Use setIsLoading
    }
  }

  const fetchStaffList = async () => {
    try {
      const response = await fetch("/api/users?role=staff")
      if (response.ok) {
        const users = await response.json()
        setStaffList(users)
      }
    } catch (error) {
      console.error("[v0] Error fetching staff list:", error)
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

    setIsAddingQuestion(true) // Use setIsAddingQuestion
    try {
      const response = await fetch(`/api/incidents/${params.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: newQuestion,
          askedBy: "Admin User", // Placeholder, should ideally come from auth context
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
      setIsAddingQuestion(false) // Use setIsAddingQuestion
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

  const saveAIContent = (incidentId: string, messages: IntelligenceMessage[]) => {
    localStorage.setItem(`ai-content-${incidentId}`, JSON.stringify({ messages }))
  }

  const handleIntelligenceSubmit = async () => {
    if (!intelligenceInput.trim() || !incident) return

    const userMessage: IntelligenceMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      text: intelligenceInput,
      timestamp: new Date(),
    }

    setIntelligenceMessages((prev) => {
      const updatedMessages = [...prev, userMessage]
      saveAIContent(incident.id, updatedMessages) // Save messages to localStorage
      return updatedMessages
    })
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

      setIntelligenceMessages((prev) => {
        const updatedMessages = [...prev, aiMessage]
        saveAIContent(incident.id, updatedMessages) // Save messages to localStorage
        return updatedMessages
      })

      if (autoSpeak) {
        speakText(data.answer)
      }
    } catch (error) {
      console.error("[v0] Error getting intelligence response:", error)
      toast.error("Failed to get response. Please try again.")
      // Add an error message to the chat
      const errorMessage: IntelligenceMessage = {
        id: `ai-error-${Date.now()}`,
        type: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setIntelligenceMessages((prev) => {
        const updatedMessages = [...prev, errorMessage]
        saveAIContent(incident.id, updatedMessages)
        return updatedMessages
      })
    } finally {
      setIsIntelligenceLoading(false)
    }
  }

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported in your browser.")
      return
    }

    // Cancel any ongoing speech
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
      setIsListening(true) // Use setIsListening
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setIntelligenceInput(transcript)
      setIsListening(false) // Use setIsListening
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      setIsListening(false) // Use setIsListening
      toast.error("Voice recognition failed. Please try again.")
    }

    recognition.onend = () => {
      setIsListening(false) // Use setIsListening
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false) // Use setIsListening
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [intelligenceMessages, isIntelligenceLoading]) // Use scrollToBottom

  if (isLoading) {
    // Use isLoading
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

  const answeredQuestions = incident.questions.filter((q) => q.answer)
  const unansweredQuestions = incident.questions.filter((q) => !q.answer)

  // Placeholder for getAIContent logic for WAiK Agent tab
  const getWAikAgentContent = () => {
    return {
      summary: "Awaiting LangGraph agent integration...",
      insights: {
        whatHappened: "Awaiting LangGraph agent analysis...",
        residentImpact: "Awaiting LangGraph agent analysis...",
        prevention: "Awaiting LangGraph agent analysis...",
        futureActions: "Awaiting LangGraph agent analysis...",
      },
      recommendations: ["Awaiting LangGraph agent integration..."],
      actions: ["Awaiting LangGraph agent integration..."],
    }
  }

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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-2 bg-white/50 p-2">
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
                  <div className="flex-1">
                    <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      {incident.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{incident.description}</CardDescription>
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
                    <p className="text-xs text-muted-foreground mb-1">Staff Member</p>
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
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-accent/20 bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={incident.status} onValueChange={updateStatus}>
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
                  <Select value={incident.priority} onValueChange={updatePriority}>
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
          </TabsContent>

          <TabsContent value="qa" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  Answered Questions ({answeredQuestions.length})
                </CardTitle>
                <CardDescription>Questions that have been answered by staff</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {answeredQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No answered questions yet</p>
                ) : (
                  answeredQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      {index > 0 && <Separator />}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-1">
                            Q
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{question.questionText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                Asked by <span className="font-medium">{question.askedBy}</span>
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(question.askedAt, "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 ml-8 mt-2">
                          <Badge className="bg-primary mt-1">A</Badge>
                          <div className="flex-1">
                            <p className="text-sm">{question.answer?.answerText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                Answered by <span className="font-medium">{question.answer?.answeredBy}</span>
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(question.answer!.answeredAt, "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                {question.answer?.method}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-accent/20 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-accent">
                  Follow-up Questions ({unansweredQuestions.length})
                </CardTitle>
                <CardDescription>Questions awaiting staff response</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {unansweredQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending questions</p>
                ) : (
                  unansweredQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      {index > 0 && <Separator />}
                      <div className="flex items-start gap-2 pt-2">
                        <Badge variant="outline" className="mt-1">
                          Q
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{question.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Asked by <span className="font-medium">{question.askedBy}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(question.askedAt, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          {question.assignedTo && question.assignedTo.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <UserPlus className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                Assigned to:{" "}
                                {question.assignedTo
                                  .map((staffId) => {
                                    const staff = staffList.find((s) => s.id === staffId)
                                    return staff?.name || staffId
                                  })
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Awaiting response
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuestion(question.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-question">Send Follow-up Question to Staff</Label>
                    <Textarea
                      id="new-question"
                      placeholder="Type your question here..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Assign to Staff Members (Optional)</Label>
                    <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                      {staffList.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No staff members available</p>
                      ) : (
                        staffList.map((staff) => (
                          <div key={staff.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={staff.id}
                              checked={selectedStaff.includes(staff.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStaff([...selectedStaff, staff.id])
                                } else {
                                  setSelectedStaff(selectedStaff.filter((id) => id !== staff.id))
                                }
                              }}
                            />
                            <label
                              htmlFor={staff.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {staff.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedStaff.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedStaff.length} staff member{selectedStaff.length > 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={sendQuestion}
                    disabled={isAddingQuestion || !newQuestion.trim()} // Use isAddingQuestion
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isAddingQuestion ? "Sending..." : "Send Question"} {/* Use isAddingQuestion */}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg h-[calc(100vh-16rem)] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Brain className="h-5 w-5 text-primary" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                    </div>
                    <CardTitle className="text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      Incident Intelligence
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className="flex items-center gap-2"
                  >
                    {autoSpeak ? (
                      <>
                        <Volume2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Audio On</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 opacity-50" />
                        <span className="hidden sm:inline">Audio Off</span>
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>Ask questions about this incident using voice or text</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {intelligenceMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 blur-3xl rounded-full" />
                        <Brain className="h-16 w-16 text-primary relative" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">Ask me anything about this incident</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          I can help you understand what happened, who was involved, current status, and provide
                          recommendations.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
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
                            className="text-xs"
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
                          className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.type === "ai" && (
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                                <Brain className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground border border-border"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                            <p
                              className={`text-xs mt-2 ${message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                            >
                              {format(message.timestamp, "h:mm a")}
                            </p>
                          </div>
                          {message.type === "user" && (
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-xs font-semibold text-accent-foreground">You</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Loading Animation */}
                      {isIntelligenceLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                              <Brain className="h-4 w-4 text-white animate-pulse" />
                            </div>
                          </div>
                          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted border border-border">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                              </div>
                              <span className="text-xs text-muted-foreground">Analyzing incident data...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 border-t bg-background p-4">
                  {isSpeaking && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-primary">
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span>Speaking response...</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Ask a question about this incident..."
                        value={intelligenceInput}
                        onChange={(e) => setIntelligenceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleIntelligenceSubmit()
                          }
                        }}
                        disabled={isIntelligenceLoading || isListening} // Use isListening
                        className="pr-12"
                      />
                      {isListening && ( // Use isListening
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="flex gap-1">
                            <div className="h-3 w-1 bg-destructive rounded-full animate-pulse" />
                            <div className="h-3 w-1 bg-destructive rounded-full animate-pulse [animation-delay:0.2s]" />
                            <div className="h-3 w-1 bg-destructive rounded-full animate-pulse [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant={isListening ? "destructive" : "outline"} // Use isListening
                      onClick={isListening ? stopVoiceRecording : startVoiceRecording} // Use isListening
                      disabled={isIntelligenceLoading}
                      className="flex-shrink-0"
                    >
                      <Mic className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} /> {/* Use isListening */}
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleIntelligenceSubmit}
                      disabled={!intelligenceInput.trim() || isIntelligenceLoading || isListening} // Use isListening
                      className="flex-shrink-0"
                    >
                      {isIntelligenceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send • Click mic to use voice •{" "}
                    {autoSpeak ? "Responses are spoken aloud" : "Audio is off"}
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
                  {aiContent && aiContent.summary ? ( // Check if summary exists
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
                  {aiContent && aiContent.insights ? ( // Check if insights exist
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
                  {aiContent && aiContent.recommendations && aiContent.recommendations.length > 0 ? ( // Check if recommendations exist
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
                  {aiContent && aiContent.actions && aiContent.actions.length > 0 ? ( // Check if actions exist
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

          <TabsContent value="waik" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">WAik Agent Summary</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  <CardDescription>LangGraph/OpenAI-generated summary will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span>Awaiting LangGraph agent integration</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 lg:col-span-2 bg-gradient-to-br from-primary/5 to-accent/5 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">WAik Agent Insights</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  <CardDescription>LangGraph/OpenAI-generated insights will appear here</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary flex items-center gap-2">
                      What happened?
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Awaiting LangGraph agent analysis</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary flex items-center gap-2">
                      What happened to the resident?
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Awaiting LangGraph agent analysis</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary flex items-center gap-2">
                      How could we have prevented this incident?
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Awaiting LangGraph agent analysis</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary flex items-center gap-2">
                      What should we do to stop incidents like this in the future?
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Awaiting LangGraph agent analysis</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">WAik Agent Recommendations</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  <CardDescription>LangGraph/OpenAI-generated recommendations will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span>Awaiting LangGraph agent integration</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">WAik Agent Actions</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  <CardDescription>LangGraph/OpenAI-generated actions will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span>Awaiting LangGraph agent integration</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
