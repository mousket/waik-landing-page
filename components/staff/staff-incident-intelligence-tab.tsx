"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Brain, Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { INCIDENT_INTELLIGENCE_COPY } from "@/lib/agents/incident-intelligence-copy"
import { cn } from "@/lib/utils"

type Citation = {
  questionText: string
  answerText: string
  tier: string
  areaHint: string
  score?: number
}

type ConversationEntry = {
  question: string
  answer: string
  citations: Citation[]
  timestamp: Date
}

function suggestedQuestions(incidentType: string): string[] {
  const t = incidentType.toLowerCase()
  if (t.includes("fall")) {
    return [
      "Was the resident injured?",
      "Who discovered the fall?",
      "What immediate actions were taken?",
      "Were family members notified?",
      "What was the environment like?",
    ]
  }
  if (t.includes("medication") || t.includes("med")) {
    return [
      "What medication was involved?",
      "Was a pharmacist contacted?",
      "Was the resident harmed?",
    ]
  }
  return [
    "Summarize the key findings",
    "What follow-up actions were documented?",
    "What notifications were made?",
  ]
}

function tierBadge(tier: string) {
  if (tier === "tier1") return "Tier 1"
  if (tier === "tier2") return "Tier 2"
  if (tier === "closing") return "Closing"
  return tier
}

export function StaffIncidentIntelligenceTab({
  incidentId,
  incidentType,
}: {
  incidentId: string
  incidentType: string
  phase: string
}) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emptyState, setEmptyState] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.length, isLoading])

  const submitQuestion = useCallback(
    async (question: string) => {
      const q = question.trim()
      if (!q || isLoading) return

      setIsLoading(true)
      setEmptyState(false)
      try {
        const res = await fetch(`/api/staff/incidents/${encodeURIComponent(incidentId)}/intelligence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            question: q,
            conversationHistory: conversation.map((entry) => ({
              question: entry.question,
              answer: entry.answer,
            })),
          }),
        })
        const data = (await res.json()) as {
          answer?: string
          citations?: Citation[]
          error?: string
        }
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Query failed")
        }

        const answer = data.answer ?? ""
        if (
          (answer.includes("doesn't have answers yet") ||
            answer.includes("having trouble pulling up")) &&
          conversation.length === 0
        ) {
          setEmptyState(true)
        }

        setConversation((prev) => [
          ...prev,
          {
            question: q,
            answer,
            citations: data.citations ?? [],
            timestamp: new Date(),
          },
        ])
        setCurrentQuestion("")
      } catch (err) {
        console.error(err)
        setConversation((prev) => [
          ...prev,
          {
            question: q,
            answer: err instanceof Error ? err.message : "Something went wrong.",
            citations: [],
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [conversation, incidentId, isLoading],
  )

  const chips = suggestedQuestions(incidentType)

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-border/50 bg-card/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {conversation.length === 0 && !emptyState && !isLoading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask questions about this incident. Answers are grounded in your recorded Q&amp;A.
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void submitQuestion(chip)}
                  className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {emptyState && conversation.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Brain className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="max-w-sm text-sm text-muted-foreground">
              {INCIDENT_INTELLIGENCE_COPY.noAnswersYet}
            </p>
          </div>
        ) : null}

        {conversation.map((entry, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-teal-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
                Q: {entry.question}
              </div>
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/50 bg-background px-3.5 py-3 text-sm shadow-sm">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{entry.answer}</p>
              {entry.citations.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sources
                  </p>
                  {entry.citations.slice(0, 4).map((c, j) => (
                    <div
                      key={j}
                      className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 text-xs"
                    >
                      <span className="shrink-0 rounded bg-teal-100 px-1.5 py-0.5 font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                        {tierBadge(c.tier)} | {c.areaHint}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{c.questionText}</p>
                        <p className="line-clamp-2 text-muted-foreground">{c.answerText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {INCIDENT_INTELLIGENCE_COPY.analyzing}
          </div>
        ) : null}
        <div ref={scrollRef} />
      </div>

      <div className="border-t border-border/40 p-3">
        <div className="flex gap-2">
          <Textarea
            className="min-h-10 max-h-28 flex-1 resize-none rounded-xl text-sm"
            placeholder="Ask a question about this incident…"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void submitQuestion(currentQuestion)
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="button"
            className={cn("min-h-10 shrink-0 rounded-xl px-4")}
            disabled={isLoading || !currentQuestion.trim()}
            onClick={() => void submitQuestion(currentQuestion)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Ask</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
