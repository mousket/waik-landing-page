"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/lib/auth-store"
import { ArrowLeft, Save, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Incident } from "@/lib/types"

export default function StaffIncidentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { userId } = useAuthStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchIncident()
  }, [id])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${id}`)
      if (!response.ok) throw new Error("Failed to fetch incident")
      const data = await response.json()
      setIncident(data.incident)

      // Initialize answers state with empty strings for unanswered questions
      const initialAnswers: Record<string, string> = {}
      data.incident.questions.forEach((q: Incident["questions"][0]) => {
        if (!q.answer) {
          initialAnswers[q.id] = ""
        }
      })
      setAnswers(initialAnswers)
    } catch (error) {
      console.error("[v0] Error fetching incident:", error)
      toast({
        title: "Error",
        description: "Failed to load incident details",
        variant: "destructive",
      })
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
          fetch(`/api/incidents/${id}/answers`, {
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

      toast({
        title: "Progress Saved",
        description: "Your answers have been saved successfully",
      })

      // Refresh incident data
      await fetchIncident()
    } catch (error) {
      console.error("[v0] Error saving progress:", error)
      toast({
        title: "Error",
        description: "Failed to save your answers",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  return (
    <div className="min-h-screen relative overflow-hidden pb-8">
      {/* Background - same as dashboard */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div
          className="absolute inset-0 opacity-20 sm:opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "2s" }}
        />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/staff/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Incident Details
            </h1>
          </div>
        </div>

        {/* Incident Info Card */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl">{incident.title}</CardTitle>
                <CardDescription className="mt-2">{incident.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={incident.priority === "high" ? "destructive" : "secondary"}>
                  {incident.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline">{incident.status.toUpperCase()}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Resident</p>
                <p className="font-medium">{incident.residentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Room</p>
                <p className="font-medium">{incident.residentRoom}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(incident.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(incident.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unanswered Questions */}
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
                        Asked on {new Date(question.askedAt).toLocaleString()}
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

        {/* Answered Questions */}
        {answeredQuestions.length > 0 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Your Previous Answers ({answeredQuestions.length})</CardTitle>
              <CardDescription>Questions you've already responded to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {answeredQuestions.map((question) => (
                <div key={question.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <p className="font-medium text-sm sm:text-base flex-1">{question.questionText}</p>
                  </div>
                  <div className="ml-6 p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm">{question.answer?.answerText}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {question.answer?.method === "voice" ? "Voice" : "Text"}
                      </Badge>
                      <span>
                        Answered on {question.answer && new Date(question.answer.answeredAt).toLocaleString()}
                      </span>
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
      </div>
    </div>
  )
}
