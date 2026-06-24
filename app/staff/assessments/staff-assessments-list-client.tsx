"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Mic } from "lucide-react"

import { AssessmentSummaryList } from "@/components/assessments/assessment-summary-list"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { displayAssessmentType, getAssessmentDueUrgency } from "@/lib/assessments/presentation"
import type { AssessmentSummary } from "@/lib/types/assessment-summary"
import { cn } from "@/lib/utils"

type TypeFilter = "all" | "activity" | "dietary"

export function StaffAssessmentsListClient() {
  const [rows, setRows] = useState<AssessmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/staff/assessments", { credentials: "include" })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          if (active) {
            setError(data.error ?? "Could not load assessments")
            setRows([])
          }
          return
        }
        const data = (await response.json()) as { assessments?: AssessmentSummary[] }
        if (active) {
          setError(null)
          setRows(data.assessments ?? [])
        }
      } catch {
        if (active) {
          setError("Could not load assessments")
          setRows([])
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const dueSoon = useMemo(
    () =>
      rows.filter(
        (a) =>
          a.supportedForStaff &&
          getAssessmentDueUrgency(a.nextDueAt, a.status) !== "none",
      ),
    [rows],
  )

  const history = useMemo(() => {
    const filtered =
      typeFilter === "all"
        ? rows
        : rows.filter((a) => a.assessmentType === typeFilter)
    return [...filtered].sort((a, b) => {
      const aTime = a.conductedAt ? new Date(a.conductedAt).getTime() : 0
      const bTime = b.conductedAt ? new Date(b.conductedAt).getTime() : 0
      return bTime - aTime
    })
  }, [rows, typeFilter])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <PageHeader
          title="Assessments"
          description="Due soon and your assessment history."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["activity", "dietary"] as const).map((type) => (
            <Link
              key={type}
              href={`/staff/assessments/${type}`}
              className={cn(
                "flex min-h-14 flex-col justify-center gap-1 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm",
                "transition hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <Mic className="h-4 w-4 text-primary" aria-hidden />
                {displayAssessmentType(type)} assessment
              </span>
              <span className="text-xs text-muted-foreground">Voice-guided · pick a resident on the next screen</span>
            </Link>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Due soon</h2>
          <p className="text-sm text-muted-foreground">Due within the next 7 days.</p>
          <AssessmentSummaryList
            rows={dueSoon}
            loading={loading}
            variant="staff"
            emptyTitle="No assessments due soon"
            emptyDescription="You're caught up for this week."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">My assessment history</h2>
          <Tabs
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            className="w-full min-w-0"
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 gap-1 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5">
              <TabsTrigger
                value="all"
                className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="dietary"
                className="rounded-xl data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm"
              >
                Dietary
              </TabsTrigger>
            </TabsList>
            <TabsContent value={typeFilter} className="mt-3 min-h-0 min-w-0">
              <AssessmentSummaryList
                rows={history.filter((a) => a.supportedForStaff)}
                loading={loading}
                variant="staff"
                emptyTitle="No assessments yet"
                emptyDescription="Completed assessments appear here with type and due dates."
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}
