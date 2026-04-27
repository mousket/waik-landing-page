"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { ClipboardList, Stethoscope, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StaffDashboardPerformanceCard,
  type StaffDashboardPerformance,
} from "@/components/staff/staff-dashboard-performance-card"

function QuickLinkRow({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: ElementType
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-transparent px-1 py-2 text-sm font-medium text-foreground transition hover:border-border/80 hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <span className="min-w-0">{label}</span>
        </span>
        <span className="text-xs text-muted-foreground" aria-hidden>
          →
        </span>
      </Link>
    </li>
  )
}

export type SidebarAssessment = {
  id: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: string
  daysUntilDue: number
}

function displayName(a: SidebarAssessment) {
  const n = (a.residentName || "").trim()
  if (n && n !== "Resident") return n
  if (a.residentRoom) return `Room ${a.residentRoom}`
  return "Resident"
}

function typeLabel(t: string) {
  if (!t) return "Assessment"
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
}

/**
 * Right column — your last 30 days, shortcuts, and “due soon” assessments.
 */
export function StaffDashboardSidebar({
  perf,
  perfLoading,
  assessments,
  assessmentsLoading,
}: {
  perf: StaffDashboardPerformance | null
  perfLoading: boolean
  assessments: SidebarAssessment[]
  assessmentsLoading: boolean
}) {
  return (
    <div className="flex w-full flex-col gap-4 lg:sticky lg:top-20 lg:w-[280px] lg:self-start">
      <StaffDashboardPerformanceCard perf={perf} loading={perfLoading} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-primary">Shortcuts</h3>
        <ul className="mt-1">
          <QuickLinkRow href="/staff/incidents" label="My incidents" icon={ClipboardList} />
          <QuickLinkRow href="/staff/residents" label="Residents" icon={Users} />
          <QuickLinkRow href="/staff/assessments" label="Assessments" icon={Stethoscope} />
        </ul>
      </div>

      {assessmentsLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      ) : assessments.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-primary">Assessments Due Soon</h3>
          <ul className="mt-3 space-y-2">
            {assessments.slice(0, 4).map((a) => {
              const d = Number(a.daysUntilDue ?? 0)
              const badge = d <= 0 ? "Today" : d === 1 ? "1 day" : `${d} days`
              const href = `/staff/assessments/${encodeURIComponent(a.assessmentType)}?${new URLSearchParams({
                residentId: a.residentId,
                residentName: (a.residentName || "Resident").trim() || "Resident",
                residentRoom: a.residentRoom || "",
              })}`
              return (
                <li key={a.id}>
                  <Link
                    href={href}
                    className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-2 text-sm transition hover:border-primary/25 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground" title={displayName(a)}>
                        {displayName(a)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {typeLabel(a.assessmentType)}
                        {a.residentRoom ? ` · Room ${a.residentRoom}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        d <= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {badge}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {assessments.length > 4 ? (
            <Button asChild variant="link" className="mt-2 h-auto min-h-11 w-full p-0 text-sm font-semibold text-primary">
              <Link href="/staff/assessments">View all due →</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
