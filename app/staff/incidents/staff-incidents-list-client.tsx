"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"
import { displayIncidentPhaseShort } from "@/lib/incidents/presentation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StaffDashboardSidebar } from "@/components/staff/staff-dashboard-sidebar"
import { StaffIncidentPill } from "@/components/staff/staff-incident-pill"
import { StaffNewReportCard } from "@/components/staff/staff-new-report-card"
import { cn } from "@/lib/utils"

const TAB_PANEL_LIST_SCROLL =
  "touch-pan-y overscroll-contain pt-0.5 pb-2 max-md:overflow-visible max-md:max-h-none md:scrollbar-thin md:min-h-[8rem] md:max-h-[min(64dvh,720px)] md:overflow-y-auto md:overflow-x-hidden md:[scrollbar-gutter:stable]"

const PILL_GRID =
  "m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 min-[1200px]:grid-cols-4"

type PhaseFilter = "all" | StaffIncidentSummary["phase"]

const PHASE_FILTERS: Array<{ value: PhaseFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "phase_1_in_progress", label: displayIncidentPhaseShort("phase_1_in_progress") },
  { value: "phase_1_complete", label: displayIncidentPhaseShort("phase_1_complete") },
  { value: "phase_2_in_progress", label: displayIncidentPhaseShort("phase_2_in_progress") },
  { value: "closed", label: displayIncidentPhaseShort("closed") },
]

const QUEUE_CARD =
  "min-h-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-background/95 to-accent/[0.07] shadow-md"

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

function matchesPhaseFilter(phase: StaffIncidentSummary["phase"], filter: PhaseFilter): boolean {
  if (filter === "all") return true
  return phase === filter
}

function PillGrid({
  rows,
  loading,
  emptyTitle,
  emptyDescription,
  mode,
  onSelect,
}: {
  rows: StaffIncidentSummary[]
  loading: boolean
  emptyTitle: string
  emptyDescription?: string
  mode: "work" | "all"
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1200px]:grid-cols-4">
        <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
        <Skeleton className="h-36 w-full min-w-0 rounded-2xl" />
        <Skeleton className="hidden h-36 w-full min-w-0 rounded-2xl sm:block" />
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyTitle}
        {emptyDescription ? ` — ${emptyDescription}` : ""}
      </p>
    )
  }
  return (
    <ul className={PILL_GRID}>
      {rows.map((inc) => (
        <li key={inc.id} className="min-w-0">
          <StaffIncidentPill incident={inc} mode={mode} onSelect={() => onSelect(inc.id)} />
        </li>
      ))}
    </ul>
  )
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className={QUEUE_CARD}>
      <div className="border-b border-border/50 px-4 py-3.5 sm:px-5 sm:py-4">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">{eyebrow}</p>
        ) : null}
        <h2 className={cn("font-semibold text-foreground", eyebrow ? "mt-1" : "")}>{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="px-3 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  )
}

export function StaffIncidentsListClient() {
  const router = useRouter()
  const [active, setActive] = useState<StaffIncidentSummary[]>([])
  const [myHistory, setMyHistory] = useState<StaffIncidentSummary[]>([])
  const [assignedToMe, setAssignedToMe] = useState<StaffIncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all")
  const [perf, setPerf] = useState<Perf | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/staff/incidents", { credentials: "include" })
        if (!r.ok) {
          if (alive) {
            setActive([])
            setMyHistory([])
            setAssignedToMe([])
          }
          return
        }
        const d = (await r.json()) as {
          active?: StaffIncidentSummary[]
          myHistory?: StaffIncidentSummary[]
          assignedToMe?: StaffIncidentSummary[]
          incidents?: StaffIncidentSummary[]
        }
        if (alive) {
          const history = d.myHistory ?? d.incidents ?? []
          setMyHistory(Array.isArray(history) ? history : [])
          setActive(Array.isArray(d.active) ? d.active : [])
          setAssignedToMe(Array.isArray(d.assignedToMe) ? d.assignedToMe : [])
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetch("/api/staff/performance")
        if (!res.ok) return
        const data = (await res.json()) as Perf
        if (alive) setPerf(data)
      } finally {
        if (alive) setPerfLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetch("/api/assessments/due")
        if (!res.ok) return
        const data = (await res.json()) as { assessments?: AssessmentRow[] }
        if (alive) setAssessments(Array.isArray(data.assessments) ? data.assessments : [])
      } finally {
        if (alive) setAssessmentsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const historyFiltered = useMemo(
    () => myHistory.filter((i) => matchesPhaseFilter(i.phase, phaseFilter)),
    [myHistory, phaseFilter],
  )

  const phaseCounts = useMemo(() => {
    const counts: Record<PhaseFilter, number> = {
      all: myHistory.length,
      phase_1_in_progress: 0,
      phase_1_complete: 0,
      phase_2_in_progress: 0,
      closed: 0,
    }
    for (const inc of myHistory) {
      counts[inc.phase] += 1
    }
    return counts
  }, [myHistory])

  const goDetail = (id: string) => router.push(`/staff/incidents/${id}`)

  const mainColumn = (
    <div className="min-h-0 min-w-0 flex-1 space-y-6 pb-6 sm:pb-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">My incidents</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Incidents</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Active reports, your filed history by phase, and investigation tasks assigned to you.
          </p>
        </div>
        <div className="flex h-full w-full min-h-0 min-w-0 shrink-0 lg:max-w-[230px] xl:max-w-[253px]">
          <StaffNewReportCard />
        </div>
      </div>

      <SectionCard
        eyebrow="Now"
        title="Active right now"
        description="Open Phase 1 reports and investigations where you have a pending task."
      >
        <div className={TAB_PANEL_LIST_SCROLL}>
          <PillGrid
            rows={active}
            loading={loading}
            mode="work"
            emptyTitle="Nothing in progress"
            emptyDescription="Start a report or check back when a task is assigned to you."
            onSelect={goDetail}
          />
        </div>
      </SectionCard>

      <SectionCard title="My reports" description="Incidents you filed — filter by workflow phase.">
        <Tabs
          value={phaseFilter}
          onValueChange={(v) => setPhaseFilter(v as PhaseFilter)}
          className="flex min-h-0 w-full flex-col gap-3"
        >
          <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
            {PHASE_FILTERS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="shrink-0 grow rounded-xl border border-transparent px-2 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md sm:px-3 sm:text-sm"
              >
                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {label}
                  <Badge variant="secondary" className="rounded-full px-1.5 text-[0.65rem] tabular-nums">
                    {loading ? "…" : phaseCounts[value]}
                  </Badge>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {PHASE_FILTERS.map(({ value }) => (
            <TabsContent
              key={value}
              value={value}
              className="mt-0 min-h-0 outline-none data-[state=inactive]:hidden"
            >
              <div className={TAB_PANEL_LIST_SCROLL}>
                <PillGrid
                  rows={historyFiltered}
                  loading={loading}
                  mode="all"
                  emptyTitle="No reports in this phase"
                  emptyDescription="Try another filter or file a new report."
                  onSelect={goDetail}
                />
                {!loading && historyFiltered.length === 0 && phaseFilter !== "all" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 min-h-11 w-full sm:w-auto"
                    onClick={() => router.push("/staff/report")}
                  >
                    Start a new report
                  </Button>
                ) : null}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SectionCard>

      <SectionCard
        title="Tasks assigned to me"
        description="Phase 2 follow-up questions from the care leadership team."
      >
        <div className={TAB_PANEL_LIST_SCROLL}>
          <PillGrid
            rows={assignedToMe}
            loading={loading}
            mode="work"
            emptyTitle="No assigned tasks"
            emptyDescription="When you are added to an investigation, it appears here."
            onSelect={goDetail}
          />
        </div>
      </SectionCard>
    </div>
  )

  return (
    <div className="relative w-full min-h-0 flex-1">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 min-h-0 pb-10 sm:pb-8 lg:flex-row lg:items-start lg:px-6">
        {mainColumn}
        <StaffDashboardSidebar
          perf={perf}
          perfLoading={perfLoading}
          assessments={assessments}
          assessmentsLoading={assessmentsLoading}
        />
      </div>
    </div>
  )
}
