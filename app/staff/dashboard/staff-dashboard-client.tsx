"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { hasPendingQuestions } from "@/lib/utils/pending-question-utils"
import { cn } from "@/lib/utils"
import { DashboardOnboarding } from "@/components/dashboard-onboarding"
import { StaffDashboardGreeting } from "@/components/staff/staff-dashboard-greeting"
import { StaffNewReportCard } from "@/components/staff/staff-new-report-card"
import { StaffDashboardSidebar } from "@/components/staff/staff-dashboard-sidebar"
import { StaffDashboardAssessmentsSpotlight } from "@/components/staff/staff-dashboard-assessments-spotlight"
import { StaffIncidentPill } from "@/components/staff/staff-incident-pill"

const RED = "#C0392B"
const AMBER = "#D97706"

/**
 * Pill list: on mobile, avoid a nested scroll (iOS won’t chain to the shell — feels like you must drag at the edge).
 * From md up, cap height and scroll inside the queue card.
 */
const TAB_PANEL_LIST_SCROLL =
  "touch-pan-y overscroll-contain pt-0.5 pb-14 sm:pb-20 max-md:overflow-visible max-md:max-h-none md:scrollbar-thin md:min-h-[8rem] md:max-h-[min(64dvh,720px)] md:overflow-y-auto md:overflow-x-hidden md:[scrollbar-gutter:stable]"

function incidentInDateRange(iso: string, from: string, to: string): boolean {
  if (!from && !to) return true
  const t = new Date(iso).getTime()
  if (from) {
    const start = new Date(`${from}T00:00:00`)
    if (Number.isNaN(start.getTime()) || t < start.getTime()) return false
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`)
    if (Number.isNaN(end.getTime()) || t > end.getTime()) return false
  }
  return true
}

type Perf = {
  averageCompleteness30d: number
  averageCompleteness30dPrev: number
  currentStreak: number
  bestStreak: number
  totalReports30d: number
  generatedAt: string
}

type AssessmentRow = {
  id: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: string
  nextDueAt: string | null
  daysUntilDue: number
}

export function StaffDashboardClient({
  firstName,
  selectedUnit,
}: {
  firstName: string
  selectedUnit: string | null
}) {
  const router = useRouter()
  const workAnchorRef = useRef<HTMLDivElement | null>(null)
  const idDateFrom = useId()
  const idDateTo = useId()
  const [workOpen, setWorkOpen] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [incidents, setIncidents] = useState<StaffIncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)
  const [perf, setPerf] = useState<Perf | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)

  const scrollToWork = useCallback(() => {
    setWorkOpen(true)
    requestAnimationFrame(() => {
      workAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoadError(null)
      try {
        const res = await fetch("/api/staff/incidents")
        if (!res.ok) {
          if (alive) setLoadError("Could not load your incidents. Try again.")
          return
        }
        const data = (await res.json()) as { incidents?: StaffIncidentSummary[] }
        if (!alive) return
        setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
      } catch {
        if (alive) setLoadError("Network error while loading incidents.")
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
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
        const data = (await res.json()) as { assessments?: AssessmentRow[] }
        if (!alive) return
        setAssessments(Array.isArray(data.assessments) ? data.assessments : [])
      } finally {
        if (alive) setAssessmentsLoading(false)
      }
    }
    void loadAssessments()
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
        const data = (await res.json()) as Perf
        if (!alive) return
        setPerf(data)
      } finally {
        if (alive) setPerfLoading(false)
      }
    }
    void loadPerf()
    return () => {
      alive = false
    }
  }, [])

  const inProgress = useMemo(
    () => incidents.filter((i) => i.phase === "phase_1_in_progress"),
    [incidents],
  )

  const pendingAction = useMemo(
    () => incidents.filter((i) => hasPendingQuestions(i)).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    ),
    [incidents],
  )

  const allRecent = useMemo(
    () =>
      [...incidents].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [incidents],
  )

  const inProgressFiltered = useMemo(
    () => inProgress.filter((i) => incidentInDateRange(i.startedAt, dateFrom, dateTo)),
    [inProgress, dateFrom, dateTo],
  )
  const pendingFiltered = useMemo(
    () => pendingAction.filter((i) => incidentInDateRange(i.startedAt, dateFrom, dateTo)),
    [pendingAction, dateFrom, dateTo],
  )
  const allRecentFiltered = useMemo(
    () => allRecent.filter((i) => incidentInDateRange(i.startedAt, dateFrom, dateTo)),
    [allRecent, dateFrom, dateTo],
  )

  const hasDateFilter = Boolean(dateFrom || dateTo)
  const openTabCount = hasDateFilter ? inProgressFiltered.length : inProgress.length
  const toCompleteCount = hasDateFilter ? pendingFiltered.length : pendingAction.length

  const mainColumn = (
    <div className="min-h-0 min-w-0 flex-1 space-y-6 pb-6 sm:pb-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch">
        {loading ? (
          <>
            <Skeleton className="min-h-[11rem] w-full flex-1 rounded-2xl" />
            <Skeleton className="min-h-[11rem] w-full shrink-0 rounded-xl lg:max-w-[230px] xl:max-w-[253px]" />
          </>
        ) : (
          <>
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
              <StaffDashboardGreeting
                firstName={firstName}
                selectedUnit={selectedUnit}
                pendingCount={pendingAction.length}
                inProgressCount={inProgress.length}
                assessmentsDueCount={assessments.length}
                onPendingClick={scrollToWork}
                onInProgressClick={scrollToWork}
                onAssessmentsClick={() => router.push("/staff/assessments")}
              />
            </div>
            <div className="flex h-full w-full min-h-0 min-w-0 shrink-0 lg:max-w-[230px] xl:max-w-[253px]">
              <StaffNewReportCard />
            </div>
          </>
        )}
      </div>

      {loadError ? (
        <div
          className="rounded-lg border border-red-200/90 bg-red-50/90 p-3 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Could not load your reports</p>
          <p className="mt-1 text-red-800/90">{loadError}</p>
        </div>
      ) : null}

      <StaffDashboardAssessmentsSpotlight assessments={assessments} loading={assessmentsLoading} />

      <div ref={workAnchorRef} className="min-h-0 scroll-mt-6">
        <Collapsible open={workOpen} onOpenChange={setWorkOpen}>
          <div className="min-h-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background/95 to-accent/[0.07] shadow-md">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full min-h-14 items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-primary/[0.04] sm:px-5 sm:py-4"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Incidents Queue</p>
                </div>
                <ChevronDown
                  className={cn("size-5 shrink-0 text-primary transition-transform", workOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 border-t border-border/50 px-3 pb-6 pt-2 sm:px-5 sm:pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-3 sm:gap-y-2">
                  <div className="min-w-0 sm:w-40 sm:flex-1 sm:min-w-[9rem]">
                    <Label htmlFor={idDateFrom} className="text-xs font-semibold text-muted-foreground">
                      From
                    </Label>
                    <Input
                      id={idDateFrom}
                      type="date"
                      className="mt-1.5 h-9 text-sm"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="min-w-0 sm:w-40 sm:flex-1 sm:min-w-[9rem]">
                    <Label htmlFor={idDateTo} className="text-xs font-semibold text-muted-foreground">
                      To
                    </Label>
                    <Input
                      id={idDateTo}
                      type="date"
                      className="mt-1.5 h-9 text-sm"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  {hasDateFilter ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full min-w-0 shrink-0 self-end sm:mt-5 sm:w-auto"
                      onClick={() => {
                        setDateFrom("")
                        setDateTo("")
                      }}
                    >
                      Clear range
                    </Button>
                  ) : null}
                </div>
                {hasDateFilter ? (
                  <p className="text-xs text-muted-foreground">
                    Counts in the tab labels reflect the selected date range.
                  </p>
                ) : null}
                <Tabs defaultValue="open" className="mt-0 flex min-h-0 w-full flex-col gap-2.5 sm:gap-3">
                  <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
                    <TabsTrigger
                      value="open"
                      className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                    >
                      <span className="flex items-center justify-center gap-2 sm:gap-2.5">
                        Open
                        <Badge
                          className="rounded-full px-1.5 text-xs tabular-nums"
                          style={{ backgroundColor: AMBER, color: "#fff" }}
                        >
                          {loading ? "…" : openTabCount}
                        </Badge>
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="action"
                      className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                    >
                      <span className="flex items-center justify-center gap-2 sm:gap-2.5">
                        To complete
                        <Badge
                          className="rounded-full px-1.5 text-xs tabular-nums"
                          style={{ backgroundColor: RED, color: "#fff" }}
                        >
                          {loading ? "…" : toCompleteCount}
                        </Badge>
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="all"
                      className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
                    >
                      All my reports
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="open" className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden">
                    <div className={TAB_PANEL_LIST_SCROLL}>
                      {loading ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                        </div>
                      ) : inProgress.length === 0 ? (
                        <div className="rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm sm:p-5">
                          <p className="font-semibold">No open Phase 1 reports</p>
                          <p className="mt-1 text-sm text-emerald-800/90">When you start a report, it will appear in this list.</p>
                          <Button
                            type="button"
                            className="mt-4 min-h-12 w-full sm:w-auto"
                            onClick={() => router.push("/staff/report")}
                          >
                            Report an incident
                          </Button>
                        </div>
                      ) : inProgressFiltered.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          No open reports in this range.{" "}
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                              setDateFrom("")
                              setDateTo("")
                            }}
                          >
                            Clear dates
                          </button>
                        </p>
                      ) : (
                        <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          {inProgressFiltered.map((inc) => (
                            <li key={inc.id} className="min-w-0">
                              <StaffIncidentPill
                                incident={inc}
                                mode="work"
                                onSelect={() => router.push(`/staff/incidents/${inc.id}`)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="action"
                    className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden"
                  >
                    <div className={TAB_PANEL_LIST_SCROLL}>
                      {loading ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                        </div>
                      ) : pendingAction.length === 0 ? (
                        <div className="p-4 text-center sm:p-6">
                          <p className="font-medium text-foreground">Nothing waiting on you</p>
                          <p className="mt-1 text-sm text-muted-foreground">Outstanding report questions will show up here.</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4 min-h-12"
                            onClick={() => router.push("/staff/report")}
                          >
                            Start a new report
                          </Button>
                        </div>
                      ) : pendingFiltered.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nothing in this range.{" "}
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                              setDateFrom("")
                              setDateTo("")
                            }}
                          >
                            Clear dates
                          </button>
                        </p>
                      ) : (
                        <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          {pendingFiltered.map((inc) => (
                            <li key={inc.id} className="min-w-0">
                              <StaffIncidentPill
                                incident={inc}
                                mode="work"
                                onSelect={() => router.push(`/staff/incidents/${inc.id}`)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="all" className="mt-0 min-h-0 flex flex-col outline-none data-[state=inactive]:hidden">
                    <div className={TAB_PANEL_LIST_SCROLL}>
                      {loading ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                          <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
                        </div>
                      ) : allRecent.length === 0 ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">You have not submitted a report yet.</p>
                      ) : allRecentFiltered.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          No reports in this range.{" "}
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                              setDateFrom("")
                              setDateTo("")
                            }}
                          >
                            Clear dates
                          </button>
                        </p>
                      ) : (
                        <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 min-[1200px]:grid-cols-4">
                          {allRecentFiltered.map((inc) => (
                            <li key={inc.id} className="min-w-0">
                              <StaffIncidentPill
                                incident={inc}
                                mode="all"
                                onSelect={() => router.push(`/staff/incidents/${inc.id}`)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {!loading && allRecent.length > 0 ? (
                      <div className="px-0 pb-2 pt-3 sm:pt-4">
                        <Button variant="ghost" asChild className="min-h-12 w-full font-semibold text-primary sm:w-auto">
                          <Link href="/staff/incidents">View full list →</Link>
                        </Button>
                      </div>
                    ) : null}
                  </TabsContent>
                </Tabs>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  )

  const sidebar = (
    <StaffDashboardSidebar
      perf={perf}
      perfLoading={perfLoading}
      assessments={assessments}
      assessmentsLoading={assessmentsLoading}
    />
  )

  return (
    <div className="relative w-full min-h-0 flex-1">
      <DashboardOnboarding role="staff" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 min-h-0 pb-10 sm:pb-8 lg:flex-row lg:items-start lg:px-6">
        {mainColumn}
        {sidebar}
      </div>
    </div>
  )
}
