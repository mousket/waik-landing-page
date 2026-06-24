"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { StaffIntelligenceAnswerBody } from "@/components/staff/staff-intelligence-answer-body"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

const SUGGESTED = [
  "How have my report completeness scores changed this month?",
  "What questions am I most often missing in my reports?",
  "What incidents have I reported in the last 30 days?",
  "Are there patterns in the incidents I've reported?",
  "Show me a summary of my recent fall reports",
] as const

type QueryResponse = {
  answer?: string
  scope?: string
  error?: string
}

export function StaffIntelligenceClient() {
  const [ask, setAsk] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (text: string) => {
    const q = text.trim()
    if (!q) return

    setSubmitting(true)
    setAnswer(null)
    try {
      const res = await fetch("/api/intelligence/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q, scope: "personal" }),
      })
      const data = (await res.json()) as QueryResponse
      if (!res.ok) {
        toast.error(data.error ?? "Could not run query")
        return
      }
      setAnswer(data.answer ?? "")
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col gap-6 px-4 py-6 pb-10">
        <PageHeader
          title="WAiK Intelligence"
          description="Ask questions about your reports and your residents. Answers use only incidents you filed in your facility."
        />

        <WaikCard variant="base" className="border-primary/15">
          <WaikCardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              Search is limited to your own incident reports. Tap a suggested question below or type your own.
            </p>
          </WaikCardContent>
        </WaikCard>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(ask)
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            className="min-h-12 flex-1 text-base"
            placeholder="Ask anything…"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            disabled={submitting}
            aria-label="Ask WAiK Intelligence"
          />
          <Button type="submit" className="min-h-12 shrink-0 font-semibold" disabled={submitting || !ask.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Ask"}
          </Button>
        </form>

        {answer ? (
          <WaikCard>
            <WaikCardContent className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Answer</p>
              <StaffIntelligenceAnswerBody text={answer} />
            </WaikCardContent>
          </WaikCard>
        ) : null}

        <div className="min-h-0 min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground/80">
            {answer ? "Try another question" : "Suggested questions"}
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                className="h-auto min-h-9 max-w-full whitespace-normal rounded-xl text-left text-xs"
                onClick={() => {
                  setAsk(s)
                  void submit(s)
                }}
                disabled={submitting}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

