"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow, isToday } from "date-fns"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { brand } from "@/lib/design-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CompletionRing } from "@/components/ui/completion-ring"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  getPendingQuestionCount,
  getPhaseDotColor,
  hasPendingQuestions,
  hasUnfinishedReport,
} from "@/lib/utils/pending-question-utils"

export default function StaffDashboardPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<StaffIncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<
    Array<{
      id: string
      residentId: string
      residentRoom: string
      assessmentType: string
      nextDueAt: string | null
      daysUntilDue: number
    }>
  >([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)
  const [perf, setPerf] = useState<{
    averageCompleteness30d: number
    averageCompleteness30dPrev: number
    currentStreak: number
    bestStreak: number
    totalReports30d: number
    generatedAt: string
  } | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)
  const [perfExpanded, setPerfExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch("/api/staff/incidents")
        if (!res.ok) return
        const data = (await res.json()) as { incidents?: StaffIncidentSummary[] }
        if (!alive) return
        setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadAssessments() {
      try {
        const res = await fetch("/api/assessments/due")
        if (!res.ok) return
        const data = (await res.json()) as { assessments?: typeof assessments }
        if (!alive) return
        setAssessments(Array.isArray(data.assessments) ? data.assessments : [])
      } finally {
        if (alive) setAssessmentsLoading(false)
      }
    }
    loadAssessments()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadPerf() {
      try {
        const res = await fetch("/api/staff/performance")
        if (!res.ok) return
        const data = (await res.json()) as NonNullable<typeof perf>
        if (!alive) return
        setPerf(data)
      } finally {
        if (alive) setPerfLoading(false)
      }
    }
    loadPerf()
    return () => {
      alive = false
    }
  }, [])

  function scoreColor(score: number): string {
    if (score >= 85) return "#0D7377"
    if (score >= 60) return "#E8A838"
    return "#C0392B"
  }

  const unfinished = useMemo(() => incidents.find(hasUnfinishedReport), [incidents])
  const pendingIncidents = useMemo(
    () =>
      [...incidents]
        .filter(hasPendingQuestions)
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()),
    [incidents],
  )
  const recentIncidents = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 5),
    [incidents],
  )

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="px-4 pt-6">
        <PageHeader
          title="Dashboard"
          description="Your shift snapshot: reports, questions, and what’s due."
          actions={
            <Button
              type="button"
              className="min-h-[48px] font-semibold shadow-lg shadow-primary/15 transition-all hover:shadow-xl hover:shadow-primary/20"
              onClick={() => router.push("/staff/report")}
            >
              Report incident
            </Button>
          }
        />
      </div>
      {/* Amber banner — unfinished report */}
      {!loading && unfinished ? (
        <div className="px-4 pt-4">
          <Link href={`/staff/incidents/${unfinished.id}`} className="block">
            <WaikCard variant="base" hover="lift" className="border-l-4 border-l-amber-400 bg-amber-50/70">
              <WaikCardContent className="py-4">
                <p className="text-sm font-semibold text-amber-950">You have an unfinished report</p>
                <p className="mt-1 text-sm text-amber-900/80">Tap to continue where you left off.</p>
              </WaikCardContent>
            </WaikCard>
          </Link>
        </div>
      ) : null}

      {/* Hero action */}
      <section className="p-4">
        <WaikCard variant="primaryGradient" hover="liftStrong" className="border-border/20">
          <WaikCardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground/70">Voice-first reporting</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground">Start an incident report in minutes</p>
              </div>
              <Button
                type="button"
                className="min-h-[48px] w-full text-base font-semibold shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/30"
                onClick={() => router.push("/staff/report")}
              >
                Report incident
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Speak at the scene, answer guided questions, and generate an audit-ready report.
              </p>
            </div>
          </WaikCardContent>
        </WaikCard>
      </section>

      {/* Pending questions */}
      <section className="px-4 pb-6">
        {loading ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <Skeleton className="mb-3 h-[124px] w-full rounded-3xl" />
            <Skeleton className="h-[124px] w-full rounded-3xl" />
          </div>
        ) : pendingIncidents.length === 0 ? (
          <WaikCard variant="base" className="border-l-4 border-l-emerald-500 bg-emerald-50/70">
            <WaikCardContent className="py-4">
              <p className="text-sm font-semibold text-emerald-950">No pending questions</p>
              <p className="mt-1 text-sm text-emerald-900/80">You’re all caught up.</p>
            </WaikCardContent>
          </WaikCard>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Questions waiting for you</h2>
              <Badge variant="destructive" className="shrink-0 rounded-full px-2">
                {pendingIncidents.length}
              </Badge>
            </div>

            {pendingIncidents.map((incident) => {
              const remaining = getPendingQuestionCount(incident)
              const startedAt = new Date(incident.startedAt)
              const elapsed = formatDistanceToNow(startedAt, { addSuffix: true })

              return (
                <article key={incident.id} className="mb-3">
                  <WaikCard variant="base" hover="lift" className="border-l-4 border-l-primary">
                    <WaikCardContent className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">Room {incident.residentRoom}</p>
                        <Badge className="shrink-0 border-0 bg-primary font-medium text-white">{incident.incidentType}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{elapsed}</span>
                        <Badge variant="destructive" className="text-xs">
                          {remaining} question{remaining === 1 ? "" : "s"} remaining
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <CompletionRing percent={incident.completenessScore} size={40} strokeWidth={3} />
                        <Button
                          size="sm"
                          className="min-h-[48px] shrink-0 bg-primary px-4 font-semibold text-white hover:bg-primary/90"
                          asChild
                        >
                          <Link href={`/staff/incidents/${incident.id}`}>Continue Report</Link>
                        </Button>
                      </div>
                    </WaikCardContent>
                  </WaikCard>
                </article>
              )
            })}
          </>
        )}
      </section>

      {/* Recent reports */}
      <section className="px-4 pb-8">
        {loading ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="rounded-xl bg-white shadow-sm">
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Your reports</h2>
              <Link href="/staff/incidents" className="text-sm font-semibold text-primary">
                View all →
              </Link>
            </div>
            <div className="rounded-3xl border border-border bg-background shadow-xl overflow-hidden">
              <ul className="divide-y divide-border">
                {recentIncidents.map((incident) => {
                  const date = new Date(incident.startedAt)
                  const dateLabel = isToday(date) ? "Today" : format(date, "MMM d")
                  const dotColor = getPhaseDotColor(incident.phase)
                  const completeness = incident.completenessAtSignoff || incident.completenessScore

                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/staff/incidents/${incident.id}`)}
                        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">Room {incident.residentRoom}</p>
                          <p className="text-xs text-muted-foreground">
                            {incident.incidentType} • {dateLabel}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden />
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {Math.round(completeness)}%
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* Assessments due this week (hidden when empty) */}
      {assessmentsLoading || assessments.length > 0 ? (
        <section className="px-4 pb-8">
          {assessmentsLoading ? (
            <div>
              <Skeleton className="mb-3 h-5 w-48" />
              <Skeleton className="h-16 w-full rounded-3xl" />
            </div>
          ) : (
            <>
              <h2 className="mb-3 text-base font-semibold text-foreground">Assessments due this week</h2>
              {assessments.map((a) => {
                const d = Number(a.daysUntilDue ?? 0)
                const badgeBg = d <= 1 ? "#16A34A" : d <= 3 ? "#E8A838" : "#9CA3AF"
                const badgeText =
                  d <= 0 ? "Today" : `${d} day${d === 1 ? "" : "s"}`

                const label =
                  a.assessmentType
                    ? `${a.assessmentType.charAt(0).toUpperCase()}${a.assessmentType.slice(1)}`
                    : "Assessment"

                return (
                  <WaikCard key={a.id} variant="base" hover="lift" className="mb-2">
                    <WaikCardContent className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">Room {a.residentRoom}</p>
                          <p className="text-xs text-muted-foreground">{label} Assessment</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className="rounded-full px-2 py-1 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: badgeBg }}
                          >
                            {badgeText}
                          </span>
                          <Button
                            size="sm"
                            className="min-h-[48px] shrink-0 bg-primary px-4 font-semibold text-white hover:bg-primary/90"
                            asChild
                          >
                            <Link
                              href={`/staff/assessments/${encodeURIComponent(a.assessmentType)}?residentId=${encodeURIComponent(a.residentId)}`}
                            >
                              Start
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </WaikCardContent>
                  </WaikCard>
                )
              })}
            </>
          )}
        </section>
      ) : null}

      {/* Performance card */}
      <section className="px-4 pb-10">
        {perfLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : perf ? (
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ color: brand.body }}>
            <button
              type="button"
              onClick={() => setPerfExpanded((v) => !v)}
              className="relative w-full text-left"
              aria-expanded={perfExpanded}
            >
              <div className="flex flex-col items-center pr-8">
                <p className="text-5xl font-bold" style={{ color: scoreColor(perf.averageCompleteness30d) }}>
                  {perf.averageCompleteness30d}%
                </p>
                <p className="mt-1 text-center text-sm" style={{ color: brand.muted }}>
                  Your average completeness (30 days)
                </p>
              </div>
              <span className="absolute bottom-0 right-0 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center text-brand-muted">
                {perfExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
            </button>

            {perfExpanded ? (
              <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: `${brand.midGray}99` }}>
                <MonthComparisonRow
                  current={perf.averageCompleteness30d}
                  prev={perf.averageCompleteness30dPrev}
                />
                {perf.currentStreak >= 3 ? (
                  <div className="rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: brand.warnBg, color: brand.darkTeal }}>
                    🔥 {perf.currentStreak}-report streak — above 85%
                  </div>
                ) : null}
                {perf.bestStreak > 0 ? (
                  <p className="text-center text-sm" style={{ color: brand.muted }}>
                    Best streak: {perf.bestStreak} report{perf.bestStreak === 1 ? "" : "s"}
                  </p>
                ) : null}
                <div className="text-center">
                  <Link href="/staff/intelligence" className="text-sm font-semibold" style={{ color: brand.teal }}>
                    View full analysis →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm" style={{ color: brand.muted }}>
              Performance data unavailable.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function MonthComparisonRow({ current, prev }: { current: number; prev: number }) {
  const hasPrev = prev > 0
  const direction = !hasPrev ? "flat" : current > prev ? "up" : current < prev ? "down" : "flat"
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→"
  const color = direction === "up" ? "#16A34A" : direction === "down" ? "#E8A838" : "#6B7280"

  return (
    <p className="text-center text-sm text-brand-body">
      This month: {current}% | Last month: {hasPrev ? `${prev}%` : "—%"}{" "}
      <span className="font-medium" style={{ color }} aria-hidden>
        {arrow}
      </span>
    </p>
  )
}
