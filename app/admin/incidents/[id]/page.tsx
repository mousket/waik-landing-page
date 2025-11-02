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
import type { Incident, User } from "@/lib/types"
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

export default function IncidentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [staffList, setStaffList] = useState<User[]>([])

  const [intelligenceMessages, setIntelligenceMessages] = useState<IntelligenceMessage[]>([])
  const [intelligenceInput, setIntelligenceInput] = useState("")
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

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
      }
    } catch (error) {
      console.error("[v0] Error fetching incident:", error)
    } finally {
      setLoading(false)
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

    setSubmitting(true)
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
      }
    } catch (error) {
      console.error("[v0] Error sending question:", error)
      toast.error("Failed to send question")
    } finally {
      setSubmitting(false)
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

  const getMockRAGResponse = (question: string, incident: Incident): string => {
    const lowerQuestion = question.toLowerCase()

    // Question patterns and responses
    if (lowerQuestion.includes("what happened") || lowerQuestion.includes("summary")) {
      return `Based on the incident report, ${incident.residentName} in Room ${incident.residentRoom} experienced ${incident.title.toLowerCase()}. The incident was reported by ${incident.staffName} and is currently marked as ${incident.status}. ${incident.description}`
    }

    if (lowerQuestion.includes("when") || lowerQuestion.includes("time")) {
      return `The incident occurred on ${formatDate(incident.createdAt, "MMMM d, yyyy 'at' h:mm a")}. It was last updated on ${formatDate(incident.updatedAt, "MMMM d, yyyy 'at' h:mm a")}.`
    }

    if (lowerQuestion.includes("who") || lowerQuestion.includes("involved") || lowerQuestion.includes("staff")) {
      return `The incident involves resident ${incident.residentName} from Room ${incident.residentRoom}. The reporting staff member is ${incident.staffName}. ${incident.questions.length > 0 ? `There are ${incident.questions.length} follow-up questions being addressed by the care team.` : ""}`
    }

    if (lowerQuestion.includes("status") || lowerQuestion.includes("progress")) {
      const answered = incident.questions.filter((q) => q.answer).length
      const total = incident.questions.length
      return `The incident status is currently "${incident.status}" with a priority level of "${incident.priority}". ${total > 0 ? `Out of ${total} follow-up questions, ${answered} have been answered by staff.` : "No follow-up questions have been added yet."}`
    }

    if (lowerQuestion.includes("priority") || lowerQuestion.includes("urgent") || lowerQuestion.includes("serious")) {
      return `This incident has been classified as "${incident.priority}" priority. ${incident.priority === "high" || incident.priority === "urgent" ? "This requires immediate attention and follow-up from the care team." : "The care team is monitoring this situation appropriately."}`
    }

    if (lowerQuestion.includes("question") || lowerQuestion.includes("follow-up") || lowerQuestion.includes("asked")) {
      const answered = incident.questions.filter((q) => q.answer)
      const unanswered = incident.questions.filter((q) => !q.answer)
      return `There are ${incident.questions.length} total questions related to this incident. ${answered.length} have been answered and ${unanswered.length} are still pending. ${unanswered.length > 0 ? `The pending questions include: ${unanswered.map((q) => q.questionText).join("; ")}` : ""}`
    }

    if (lowerQuestion.includes("resident") || lowerQuestion.includes("patient")) {
      return `The resident involved is ${incident.residentName}, located in Room ${incident.residentRoom}. ${incident.description.includes("injury") || incident.description.includes("fall") ? "Medical assessment and appropriate care protocols have been initiated." : "The resident's wellbeing is being monitored by the care team."}`
    }

    if (lowerQuestion.includes("prevent") || lowerQuestion.includes("future") || lowerQuestion.includes("avoid")) {
      return `To prevent similar incidents in the future, the care team should review the circumstances that led to this event. Key preventive measures may include enhanced monitoring, environmental modifications, updated care protocols, and staff training. A comprehensive incident review will identify specific action items.`
    }

    if (lowerQuestion.includes("action") || lowerQuestion.includes("next step") || lowerQuestion.includes("do now")) {
      return `Recommended next steps: 1) Ensure all follow-up questions are answered by assigned staff, 2) Complete a thorough incident review with the care team, 3) Update the resident's care plan if needed, 4) Document any environmental or procedural changes, and 5) Schedule follow-up monitoring to ensure resident safety.`
    }

    // Default response
    return `Based on the incident data, I can tell you that this ${incident.priority} priority incident involving ${incident.residentName} in Room ${incident.residentRoom} is currently ${incident.status}. The incident "${incident.title}" was reported by ${incident.staffName}. Is there a specific aspect of this incident you'd like to know more about?`
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

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000))

    const aiResponse = getMockRAGResponse(intelligenceInput, incident)

    const aiMessage: IntelligenceMessage = {
      id: `ai-${Date.now()}`,
      type: "ai",
      text: aiResponse,
      timestamp: new Date(),
    }

    setIntelligenceMessages((prev) => [...prev, aiMessage])
    setIsIntelligenceLoading(false)

    // Speak the response
    speakText(aiResponse)
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
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
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setIntelligenceInput(transcript)
      setIsRecording(false)
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      setIsRecording(false)
      toast.error("Voice recognition failed. Please try again.")
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [intelligenceMessages, isIntelligenceLoading])

  if (loading) {
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

        <Tabs defaultValue="overview" className="w-full">
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
                    disabled={submitting || !newQuestion.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? "Sending..." : "Send Question"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg h-[calc(100vh-16rem)] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Brain className="h-5 w-5 text-primary" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <CardTitle className="text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    Incident Intelligence
                  </CardTitle>
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
                        disabled={isIntelligenceLoading || isRecording}
                        className="pr-12"
                      />
                      {isRecording && (
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
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={isIntelligenceLoading}
                      className="flex-shrink-0"
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleIntelligenceSubmit}
                      disabled={!intelligenceInput.trim() || isIntelligenceLoading || isRecording}
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
                    Press Enter to send • Click mic to use voice • Responses are spoken aloud
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
