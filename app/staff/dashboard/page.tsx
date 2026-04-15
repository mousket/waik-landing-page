import Link from "next/link"
import { brand } from "@/lib/design-tokens"
import { StaffDashboardPerformance } from "@/components/staff/staff-dashboard-performance"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function StaffDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Amber banner — placeholder for unfinished report */}
      <div className="px-4 pt-4">
        <div
          className="rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium"
          style={{
            backgroundColor: brand.warnBg,
            borderLeftColor: brand.accent,
            color: brand.darkTeal,
          }}
        >
          You have an unfinished report — tap to continue
        </div>
      </div>

      {/* Hero action */}
      <section className="p-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: brand.teal }}>
          <Button
            asChild
            className="h-auto min-h-[48px] w-full rounded-xl bg-white px-4 py-4 text-lg font-bold shadow-none hover:bg-white/95"
            style={{ color: brand.teal }}
          >
            <Link href="/staff/report">🎤 Report Incident</Link>
          </Button>
          <p className="mt-3 text-center text-sm text-white/90">
            Start a voice report in under 10 minutes
          </p>
        </div>
      </section>

      {/* Pending questions */}
      <section className="px-4 pb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-brand-dark-teal">Questions waiting for you</h2>
          <Badge variant="destructive" className="shrink-0 rounded-full px-2">
            2
          </Badge>
        </div>

        <article
          className="mb-3 rounded-xl border-l-4 bg-white p-4 shadow-sm"
          style={{ borderLeftColor: brand.accent }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-brand-body">Room 204 — Fall Incident</p>
            <Badge
              className="shrink-0 border-0 font-medium text-white"
              style={{ backgroundColor: brand.teal }}
            >
              Fall
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: brand.muted }}>3 hours ago</span>
            <Badge variant="destructive" className="text-xs">
              4 questions remaining
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
              style={{ borderColor: brand.teal, color: brand.teal }}
            >
              67%
            </div>
            <Button
              size="sm"
              className="min-h-[48px] shrink-0 px-4 font-semibold text-white"
              style={{ backgroundColor: brand.teal }}
              asChild
            >
              <Link href="/staff/incidents">Continue Report</Link>
            </Button>
          </div>
        </article>

        <article
          className="rounded-xl border-l-4 bg-white p-4 shadow-sm"
          style={{ borderLeftColor: brand.accent }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-brand-body">Room 102 — Medication Error</p>
            <Badge
              className="shrink-0 border-0 font-medium text-white"
              style={{ backgroundColor: brand.teal }}
            >
              Med
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: brand.muted }}>1 hour ago</span>
            <Badge variant="destructive" className="text-xs">
              2 questions
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
              style={{ borderColor: brand.teal, color: brand.teal }}
            >
              88%
            </div>
            <Button
              size="sm"
              className="min-h-[48px] shrink-0 px-4 font-semibold text-white"
              style={{ backgroundColor: brand.teal }}
              asChild
            >
              <Link href="/staff/incidents">Continue Report</Link>
            </Button>
          </div>
        </article>
      </section>

      {/* Recent reports */}
      <section className="px-4 pb-6">
        <h2 className="mb-3 text-base font-semibold text-brand-dark-teal">Your reports</h2>
        <ul className="divide-y divide-brand-mid-gray/80 rounded-xl bg-white shadow-sm">
          <li>
            <Link
              href="/staff/incidents"
              className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 active:bg-brand-light-bg/80"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-body">Room 204 — Fall</p>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Today
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                <span className="text-sm font-medium tabular-nums text-brand-body">82%</span>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/staff/incidents"
              className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 active:bg-brand-light-bg/80"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-body">Room 306 — Medication Error</p>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Yesterday
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
                <span className="text-sm font-medium tabular-nums text-brand-body">76%</span>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/staff/incidents"
              className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 active:bg-brand-light-bg/80"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-body">Room 515 — Fall</p>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Mar 28
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span className="text-sm font-medium tabular-nums text-brand-body">91%</span>
              </div>
            </Link>
          </li>
        </ul>
        <div className="mt-3 text-right">
          <Link href="/staff/incidents" className="text-sm font-semibold" style={{ color: brand.teal }}>
            View all →
          </Link>
        </div>
      </section>

      {/* Upcoming assessments */}
      <section className="px-4 pb-6">
        <h2 className="mb-3 text-base font-semibold text-brand-dark-teal">Assessments due this week</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="min-w-0 flex-1 text-sm font-medium text-brand-body">
            Room 411 — Activity Assessment — Due tomorrow
          </p>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[48px] shrink-0 border-2 border-brand-teal font-semibold text-brand-teal hover:bg-brand-light-bg/50"
            asChild
          >
            <Link href="/staff/assessments">Start</Link>
          </Button>
        </div>
      </section>

      <StaffDashboardPerformance />
    </div>
  )
}
