"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/lib/auth-store"
import { ArrowLeft, Save, MessageSquare, FileText, Sparkles, Brain, Lightbulb, Target, Mic } from "lucide-react"
import { toast } from "sonner"
import type { Incident } from "@/lib/types"
import { format } from "date-fns"

export default function StaffIncidentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { userId } = useAuthStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchIncident()
  }, [resolvedParams.id])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${resolvedParams.id}`)
      if (!response.ok) throw new Error("Failed to fetch incident")
      const data = await response.json()
      setIncident(data)

      // Initialize answers state with empty strings for unanswered questions
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
      // Save all non-empty answers
      const savePromises = Object.entries(answers)
        .filter(([_, answerText]) => answerText.trim() !== "")
        .map(([questionId, answerText]) =>
          fetch(`/api/incidents/${resolvedParams.id}/answers`, {
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

      // Refresh incident data
      await fetchIncident()
    } catch (error) {
      console.error("[v0] Error saving progress:", error)
      toast.error("Failed to save your answers")
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading incident details...</p>
        </div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Incident Not Found</CardTitle>
            <CardDescription>
              The incident you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/staff/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unansweredQuestions = incident.questions.filter((q) => !q.answer)
  const answeredQuestions = incident.questions.filter((q) => q.answer)
  const aiContent = getAIContent(incident.id)

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
                      {incident.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{incident.description}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={incident.priority === "high" ? "destructive" : "secondary"}>
                      {incident.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{incident.status.toUpperCase()}</Badge>
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
                    <p className="font-medium">{format(new Date(incident.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-medium">{format(new Date(incident.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="qa" className="space-y-6 mt-6">
            {unansweredQuestions.length > 0 && (
              <Card className="bg-white shadow-lg border-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <MessageSquare className="h-5 w-5" />
                    Questions Awaiting Your Response ({unansweredQuestions.length})
                  </CardTitle>
                  <CardDescription>Please provide your answers to help complete this incident report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {unansweredQuestions.map((question) => (
                    <div key={question.id} className="space-y-3 p-4 border rounded-lg bg-accent/5">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm sm:text-base">{question.questionText}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Asked {format(new Date(question.askedAt), "MMM d, yyyy 'at' h:mm a")}
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
                              Asked {format(new Date(question.askedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 ml-8 mt-2">
                          <Badge className="bg-primary mt-1">A</Badge>
                          <div className="flex-1">
                            <p className="text-sm">{question.answer?.answerText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                Answered {format(new Date(question.answer!.answeredAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                {question.answer?.method}
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

            {unansweredQuestions.length === 0 && answeredQuestions.length === 0 && (
              <Card className="bg-white shadow-lg">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No questions have been added to this incident yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    Incident Intelligence
                  </CardTitle>
                </div>
                <CardDescription>Ask questions about this incident using voice or text</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">Intelligence system coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    This will allow you to ask questions about the incident and get AI-powered answers
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
