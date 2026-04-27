"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { IntelligenceAnswerBody } from "@/components/admin/intelligence-answer-body"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

const DynamicCompletenessChart = dynamic(
  () => import("@/components/admin/intelligence-completeness-chart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading chart…
      </div>
    ),
  },
)

const SUGGESTED = [
  "How many falls or injuries were reported this month?",
  "What incidents are still in Phase 1 for this community?",
  "List recent reports with the lowest documentation completeness.",
  "Which days had the most incident volume in the last two weeks?",
  "Summarize any trends in medication-related incidents.",
  "Are there reports still waiting for Phase 2 investigation?",
  "What is the mix of high vs. medium priority in recent reports?",
  "Give a short weekly snapshot for the leadership huddle.",
] as const

type InsightResponse = { cards: Array<{ id: string; title: string; body: string }>; generatedAt: string }

export default function AdminIntelligencePage() {
  const sp = useAdminUrlSearchParams()
  const q = useMemo(() => getAdminContextQueryString(sp), [sp])
  const [insights, setInsights] = useState<InsightResponse | null>(null)
  const [insLoad, setInsLoad] = useState(true)
  const [insErr, setInsErr] = useState<string | null>(null)
  const [ask, setAsk] = useState("")
  const [ans, setAns] = useState<string | null>(null)
  const [sub, setSub] = useState(false)
  const [brief, setBrief] = useState<string | null>(null)

  const load = useCallback(async () => {
    setInsLoad(true)
    setInsErr(null)
    try {
      const r = await fetch(`/api/admin/intelligence/insights${q}`, { credentials: "include" })
      if (!r.ok) {
        setInsErr("Could not load insight cards")
        return
      }
      setInsights((await r.json()) as InsightResponse)
    } catch {
      setInsErr("Could not load insight cards")
    } finally {
      setInsLoad(false)
    }
  }, [q])

  const loadBrief = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/daily-brief${q}`, { credentials: "include" })
      if (r.ok) {
        const j = (await r.json()) as { text?: string }
        setBrief(j.text ?? null)
      }
    } catch {
      /* optional */
    }
  }, [q])

  useEffect(() => {
    void load()
    void loadBrief()
  }, [load, loadBrief])

  const submit = async (text: string) => {
    const t = text.trim()
    if (!t) {
      return
    }
    setSub(true)
    setAns(null)
    try {
      const r = await fetch(`/api/admin/intelligence/query${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: t, ...Object.fromEntries(sp.entries()) }),
        credentials: "include",
      })
      const j = (await r.json()) as { answer?: string; error?: string }
      if (!r.ok) {
        toast.error(j.error ?? "Request failed")
        return
      }
      setAns(j.answer ?? "")
    } catch {
      toast.error("Network error")
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:py-8">
        <PageHeader
          title="WAiK Intelligence"
          description="Ask about incident patterns in the selected community. All answers are limited to the current facility scope (never cross-facility)."
        />

        {brief ? (
          <WaikCard>
            <WaikCardContent className="p-4 text-sm text-foreground/90">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Daily brief</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{brief}</p>
            </WaikCardContent>
          </WaikCard>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(ask)
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            className="min-h-12 flex-1 text-base"
            placeholder="Ask a question about your community’s incidents…"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            disabled={sub}
          />
          <Button type="submit" className="min-h-12 shrink-0" disabled={sub || !ask.trim()}>
            {sub ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>

        {ans ? (
          <WaikCard>
            <WaikCardContent className="p-4 text-sm text-foreground/90">
              <IntelligenceAnswerBody text={ans} searchParams={sp} />
            </WaikCardContent>
          </WaikCard>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-foreground/80">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                className="h-auto min-h-9 max-w-full whitespace-normal text-left text-xs"
                onClick={() => {
                  setAsk(s)
                  void submit(s)
                }}
                disabled={sub}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold">Completeness trend (8 weeks)</h2>
          <p className="mb-3 text-xs text-muted-foreground">Average Phase 1 documentation score by week for the selected community.</p>
          <div className="mb-6 rounded-lg border border-border/60 bg-card/30 p-3">
            <DynamicCompletenessChart contextQuery={q} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold">This week at a glance</h2>
          {insLoad ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : insErr ? (
            <p className="text-sm text-destructive">{insErr}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(insights?.cards ?? []).map((c) => (
                <WaikCard key={c.id} variant="base">
                  <WaikCardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-semibold text-foreground">{c.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.body}</p>
                  </WaikCardContent>
                </WaikCard>
              ))}
            </div>
          )}
        </div>
        {insights?.generatedAt ? (
          <p className="text-xs text-muted-foreground">Insights data snapshot: {insights.generatedAt}</p>
        ) : null}
      </div>
    </div>
  )
}
