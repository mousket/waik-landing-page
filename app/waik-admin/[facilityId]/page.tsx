"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { Button } from "@/components/ui/button"

type DeepPayload = {
  facility: {
    id: string
    name: string
    type: string
    state: string
    plan: string | null
    onboardingDate: string | null
  }
  metrics: {
    dailyActiveUsersThisWeek: number
    averageIncidentsPerDay30d: number
    averagePhase1Completeness30d: number
    averagePhase1CompletenessPrev30d: number
    phase2CloseRate: number
  }
  staff: Array<{
    id: string
    name: string
    email: string
    roleSlug: string
    lastLoginAt: string | null
    reportCount: number
    avgCompleteness: number
  }>
  recentIncidents: IncidentSummary[]
  feedback: {
    averageRating1to2: number
    totalResponses: number
    recent5: Array<{ rating: number; comment: string; at: string | null }>
  }
}

export default function WaikAdminFacilityPage() {
  const params = useParams()
  const facilityId = typeof params.facilityId === "string" ? params.facilityId : ""
  const [data, setData] = useState<DeepPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!facilityId) {
      setLoading(false)
      setError("Invalid facility id.")
      return
    }
    let cancelled = false
    void (async () => {
      setError(null)
      setLoading(true)
      try {
        const res = await fetch(`/api/waik-admin/communities/${encodeURIComponent(facilityId)}`, {
          credentials: "include",
        })
        if (res.status === 404) {
          if (!cancelled) {
            setError("Facility not found.")
            setData(null)
          }
          return
        }
        if (!res.ok) {
          if (!cancelled) {
            setError("Could not load this facility.")
            setData(null)
          }
          return
        }
        const j = (await res.json()) as DeepPayload
        if (!cancelled) setData(j)
      } catch {
        if (!cancelled) {
          setError("Could not load this facility.")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [facilityId])

  return (
    <div className="space-y-6 py-1 md:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminBreadcrumb
          items={[
            { label: "Super Admin", href: "/waik-admin" },
            { label: data?.facility.name || "Community" },
          ]}
        />
        <Button variant="outline" size="sm" className="w-fit" asChild>
          <Link href="/waik-admin">Back to list</Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !loading ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && !loading && !error && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.facility.name}</h1>
            <p className="text-sm text-muted-foreground">
              {data.facility.type} — {data.facility.state} — plan {data.facility.plan ?? "—"}
              {data.facility.onboardingDate
                ? ` — onboarded ${new Date(data.facility.onboardingDate).toLocaleDateString()}`
                : null}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { k: "DAU (7d)", v: data.metrics.dailyActiveUsersThisWeek, sub: "staff with a login in the last week" },
              { k: "Incidents / day (30d)", v: data.metrics.averageIncidentsPerDay30d, sub: "30-day window" },
              { k: "P1 avg completeness (30d)", v: data.metrics.averagePhase1Completeness30d, sub: "this period" },
              { k: "P1 avg (prev 30d)", v: data.metrics.averagePhase1CompletenessPrev30d, sub: "prior 30d" },
              { k: "P2 close rate", v: `${data.metrics.phase2CloseRate}%`, sub: "of incidents that reached P1" },
            ].map((m) => (
              <WaikCard key={m.k}>
                <WaikCardContent className="p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{m.k}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{m.v}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
                </WaikCardContent>
              </WaikCard>
            ))}
          </div>

          <WaikCard>
            <WaikCardContent className="p-0">
              <div className="border-b border-border/50 p-5">
                <CardTitle>Staff & engagement</CardTitle>
                <CardDescription className="mt-0.5">Clinic roles and how often each account appears on reports</CardDescription>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Reports (as author)</th>
                      <th className="px-4 py-2.5">Avg completeness</th>
                      <th className="px-4 py-2.5">Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.staff.map((u) => (
                      <tr key={u.id} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-2.5">{u.roleSlug}</td>
                        <td className="px-4 py-2.5 tabular-nums">{u.reportCount}</td>
                        <td className="px-4 py-2.5 tabular-nums">{u.avgCompleteness}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WaikCardContent>
          </WaikCard>

          <WaikCard>
            <WaikCardContent className="space-y-2 p-6">
              <CardTitle>Pilot feedback</CardTitle>
              <CardDescription>Anonymous ratings and recent comments (most recent first)</CardDescription>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <p className="text-sm">
                  <span className="font-medium text-foreground">Average (1–2):</span>{" "}
                  <span className="tabular-nums">{data.feedback.averageRating1to2}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-foreground">Total responses:</span>{" "}
                  {data.feedback.totalResponses}
                </p>
              </div>
              {data.feedback.recent5.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {data.feedback.recent5.map((r, i) => (
                    <li key={i} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <span className="font-mono text-xs text-foreground/80">Rating {r.rating}</span>{" "}
                      {r.at ? <span className="text-xs">· {new Date(r.at).toLocaleString()}</span> : null}
                      {r.comment ? <p className="mt-1.5 text-foreground/90">&ldquo;{r.comment}&rdquo;</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              )}
            </WaikCardContent>
          </WaikCard>

          <WaikCard>
            <WaikCardContent className="p-0">
              <div className="border-b border-border/50 p-5">
                <CardTitle>Recent incidents</CardTitle>
                <CardDescription>Last 20 by update time (summary)</CardDescription>
              </div>
              <div className="overflow-x-auto p-0">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Room</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Phase</th>
                      <th className="px-4 py-2.5">P1 comp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentIncidents.map((inc) => (
                      <tr key={inc.id} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5">{inc.residentRoom}</td>
                        <td className="px-4 py-2.5">{inc.incidentType}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{inc.phase}</td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {inc.completenessAtSignoff != null ? inc.completenessAtSignoff : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WaikCardContent>
          </WaikCard>
        </>
      )}
    </div>
  )
}
