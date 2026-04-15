"use client"

import { useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { brand } from "@/lib/design-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const RED = "#C0392B"
const RED_BG = "#FDE8E8"

function RingPct({ pct, className }: { pct: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
        className,
      )}
      style={{ borderColor: brand.teal, color: brand.teal }}
    >
      {pct}
    </div>
  )
}

function ClockCell({ text, tone }: { text: string; tone: "gray" | "amber" | "red" }) {
  const cls =
    tone === "red"
      ? "font-bold text-[#C0392B]"
      : tone === "amber"
        ? "font-medium text-[#E8A838]"
        : "text-brand-muted"
  return <span className={cn("text-sm tabular-nums", cls)}>{text}</span>
}

export function AdminDashboardShell() {
  const [showBrief, setShowBrief] = useState(true)

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
      <div className="min-w-0 flex-1 space-y-6">
        {showBrief ? (
          <div
            className="relative rounded-xl border-l-4 bg-brand-light-bg p-4 pr-12 shadow-sm"
            style={{ borderLeftColor: brand.teal }}
          >
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="absolute right-3 top-3 flex h-10 w-10 min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-brand-muted hover:bg-white/60"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="font-medium text-brand-dark-teal">Good morning. Here is your community at a glance.</p>
            <p className="mt-2 text-sm text-brand-body">
              3 open investigations &nbsp;|&nbsp; 5 staff questions &nbsp;|&nbsp; 2 assessments due
            </p>
          </div>
        ) : null}

        <Tabs defaultValue="attention" className="w-full gap-4">
          <TabsList className="mb-2 flex h-auto w-full min-h-[48px] flex-wrap items-stretch justify-start gap-1 rounded-none border-b border-brand-mid-gray bg-transparent p-0 sm:gap-4">
            <TabsTrigger
              value="attention"
              className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <span className="flex items-center gap-2">
                Needs Attention
                <Badge className="rounded-full px-1.5 text-xs" style={{ backgroundColor: RED, color: "#fff" }}>
                  3
                </Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent"
            >
              <span className="flex items-center gap-2">
                Active Investigations
                <Badge className="rounded-full bg-sky-600 px-1.5 text-xs text-white">4</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="closed"
              className="data-[state=active]:text-brand-teal rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent"
            >
              Closed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attention" className="mt-0 space-y-8 outline-none">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#C0392B]">
                Immediate Action Required
              </h2>
              <div
                className="rounded-xl border-l-4 p-4"
                style={{ borderLeftColor: RED, backgroundColor: RED_BG }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-brand-body">⚠️ Room 204 — Fall Incident</p>
                  <Badge className="shrink-0" style={{ backgroundColor: RED, color: "#fff" }}>
                    4 hours ago
                  </Badge>
                </div>
                <p className="mt-2 text-sm" style={{ color: brand.accent }}>
                  ⚠️ Injury reported — state notification may be required
                </p>
                <p className="mt-2 text-sm text-brand-muted">Reported by: Maria Torres, RN</p>
                <Button
                  className="mt-4 h-auto min-h-[48px] w-full font-semibold text-white sm:w-auto sm:min-w-[200px]"
                  style={{ backgroundColor: brand.teal }}
                  type="button"
                >
                  Claim Investigation
                </Button>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark-teal">
                Awaiting Investigation Claim
              </h2>
              <div className="space-y-3">
                <div
                  className="rounded-xl border-l-4 p-4"
                  style={{ borderLeftColor: brand.accent, backgroundColor: brand.warnBg }}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-brand-body">Room 306 — Medication Error</p>
                    <span className="text-sm text-brand-muted">3 hours ago</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-brand-body">82% complete</p>
                  <Button
                    variant="outline"
                    className="mt-3 min-h-[48px] border-2 font-semibold"
                    style={{ borderColor: brand.accent, color: brand.darkTeal }}
                    type="button"
                  >
                    Claim
                  </Button>
                </div>
                <div
                  className="rounded-xl border-l-4 p-4"
                  style={{ borderLeftColor: brand.accent, backgroundColor: brand.warnBg }}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-brand-body">Room 411 — Resident Conflict</p>
                    <span className="text-sm text-brand-muted">2 hours ago</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-brand-body">76% complete</p>
                  <Button
                    variant="outline"
                    className="mt-3 min-h-[48px] border-2 font-semibold"
                    style={{ borderColor: brand.accent, color: brand.darkTeal }}
                    type="button"
                  >
                    Claim
                  </Button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark-teal">
                Overdue IDT Tasks
              </h2>
              <div
                className="rounded-xl border-l-4 border-amber-500 p-4"
                style={{ borderLeftColor: brand.accent, backgroundColor: brand.warnBg }}
              >
                <p className="font-medium text-brand-body">Physical Therapy — Room 204 investigation</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: RED }}>
                  26 hours overdue
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 min-h-[48px] border-2 border-brand-teal font-semibold text-brand-teal"
                  type="button"
                >
                  Send Reminder
                </Button>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="active" className="mt-0 space-y-4 outline-none">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-[40px] rounded-full bg-brand-teal px-4 text-sm font-medium text-white"
              >
                All
              </button>
              <button
                type="button"
                className="min-h-[40px] rounded-full bg-white px-4 text-sm font-medium text-brand-muted ring-1 ring-brand-mid-gray"
              >
                Phase 1
              </button>
              <button
                type="button"
                className="min-h-[40px] rounded-full bg-white px-4 text-sm font-medium text-brand-muted ring-1 ring-brand-mid-gray"
              >
                Phase 2
              </button>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-brand-mid-gray bg-white md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-mid-gray bg-brand-light-bg/50">
                    <th className="p-3 font-semibold">Room</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Phase</th>
                    <th className="p-3 font-semibold">Completeness</th>
                    <th className="p-3 font-semibold">48hr Clock</th>
                    <th className="p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-brand-mid-gray/80">
                    <td className="p-3">204</td>
                    <td className="p-3">Fall</td>
                    <td className="p-3">
                      <Badge className="bg-sky-600 text-white">Phase 2</Badge>
                    </td>
                    <td className="p-3">
                      <RingPct pct="82%" />
                    </td>
                    <td className="p-3">
                      <ClockCell text="28h remaining" tone="amber" />
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                        View
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-b border-brand-mid-gray/80">
                    <td className="p-3">306</td>
                    <td className="p-3">Medication</td>
                    <td className="p-3">
                      <Badge className="bg-sky-600 text-white">Phase 2</Badge>
                    </td>
                    <td className="p-3">
                      <RingPct pct="76%" />
                    </td>
                    <td className="p-3">
                      <ClockCell text="5h remaining" tone="red" />
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                        View
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-b border-brand-mid-gray/80">
                    <td className="p-3">411</td>
                    <td className="p-3">Conflict</td>
                    <td className="p-3">
                      <Badge className="bg-amber-400 text-brand-dark-teal">Phase 1 Complete</Badge>
                    </td>
                    <td className="p-3">
                      <RingPct pct="91%" />
                    </td>
                    <td className="p-3">
                      <ClockCell text="44h remaining" tone="gray" />
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                        View
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">102</td>
                    <td className="p-3">Fall</td>
                    <td className="p-3">
                      <Badge className="bg-amber-500/90 text-white">Phase 1 In Progress</Badge>
                    </td>
                    <td className="p-3">
                      <RingPct pct="45%" />
                    </td>
                    <td className="p-3">
                      <ClockCell text="47h remaining" tone="gray" />
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                        View
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {[
                { room: "204", type: "Fall", phase: "Phase 2", pct: "82%", clock: "28h remaining", tone: "amber" as const },
                { room: "306", type: "Medication", phase: "Phase 2", pct: "76%", clock: "5h remaining", tone: "red" as const },
                { room: "411", type: "Conflict", phase: "P1 Complete", pct: "91%", clock: "44h remaining", tone: "gray" as const },
                { room: "102", type: "Fall", phase: "P1 In Progress", pct: "45%", clock: "47h remaining", tone: "gray" as const },
              ].map((r) => (
                <div key={r.room} className="rounded-xl border border-brand-mid-gray bg-white p-4">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">Room {r.room}</span>
                    <RingPct pct={r.pct} />
                  </div>
                  <p className="mt-1 text-sm text-brand-muted">{r.type}</p>
                  <p className="text-sm">{r.phase}</p>
                  <ClockCell text={r.clock} tone={r.tone} />
                  <Button className="mt-3 w-full min-h-[48px] text-white" style={{ backgroundColor: brand.teal }}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="closed" className="mt-0 space-y-4 outline-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-brand-dark-teal">Closed investigations</h3>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] border-2 border-brand-teal font-semibold text-brand-teal"
              >
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-brand-mid-gray bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-mid-gray bg-brand-light-bg/50">
                    <th className="p-3 font-semibold">Room</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Score</th>
                    <th className="p-3 font-semibold">Investigator</th>
                    <th className="p-3 font-semibold">Days to Close</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-brand-mid-gray/80">
                    <td className="p-3">515</td>
                    <td className="p-3">Mar 28</td>
                    <td className="p-3">93%</td>
                    <td className="p-3">Dr. Sarah Kim</td>
                    <td className="p-3">3 days</td>
                  </tr>
                  <tr className="border-b border-brand-mid-gray/80">
                    <td className="p-3">204</td>
                    <td className="p-3">Mar 18</td>
                    <td className="p-3">71%</td>
                    <td className="p-3">Dr. Sarah Kim</td>
                    <td className="p-3">5 days</td>
                  </tr>
                  <tr>
                    <td className="p-3">411</td>
                    <td className="p-3">Mar 10</td>
                    <td className="p-3">85%</td>
                    <td className="p-3">James Wilson</td>
                    <td className="p-3">4 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-[280px] lg:self-start">
        <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-dark-teal">Last 30 Days</h3>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
              <span className="text-2xl font-bold text-brand-teal">12</span>
              <div className="text-right">
                <p className="font-medium text-brand-body">Total Incidents</p>
                <p className="text-xs text-emerald-600">↑ vs 9 last month</p>
              </div>
            </li>
            <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
              <span className="text-2xl font-bold text-brand-teal">78%</span>
              <div className="text-right">
                <p className="font-medium text-brand-body">Avg Completeness</p>
                <p className="text-xs text-emerald-600">↑ vs 71%</p>
              </div>
            </li>
            <li className="flex justify-between gap-2 border-b border-brand-mid-gray/60 pb-3">
              <span className="text-2xl font-bold text-brand-teal">3.2</span>
              <div className="text-right">
                <p className="font-medium text-brand-body">Avg Days to Close</p>
                <p className="text-xs text-emerald-600">↓ vs 4.1</p>
              </div>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-2xl font-bold text-brand-teal">8%</span>
              <div className="text-right">
                <p className="font-medium text-brand-body">With Injury Flag</p>
                <p className="text-xs text-brand-muted">—</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-dark-teal">Due This Week</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-body">
            <li>Room 411 — Activity Assessment — Tomorrow</li>
            <li>Room 204 — Dietary Assessment — Thu</li>
          </ul>
          <Link href="/admin/assessments" className="mt-3 inline-block text-sm font-semibold text-brand-teal">
            View all →
          </Link>
        </div>

        <div className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-dark-teal">Ask your community...</h3>
          <Input
            readOnly
            placeholder='e.g. How many falls this month?'
            className="mt-3 min-h-[48px]"
            aria-readonly
          />
        </div>
      </aside>
    </div>
  )
}
