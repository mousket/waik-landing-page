"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

type OrgRow = {
  id: string
  name: string
  type: string
  plan: string
  facilityCount: number
  staffCount: number
  createdAt: string
}

type OverviewStats = {
  totalOrganizations: number
  incidentsThisMonth: number
  mostActiveOrganizationName: string | null
}

type FacilityRow = {
  id: string
  name: string
  type: string
  state: string
  plan: string | null
  staffCount: number
  incidents30d: number
  avgCompleteness30d: number
  lastActivity: string | null
}

export default function WaikAdminHomePage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [orgsError, setOrgsError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [facilities, setFacilities] = useState<FacilityRow[]>([])
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null)
  const [facilitiesLoading, setFacilitiesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadOrgs() {
      setOrgsError(null)
      try {
        const oRes = await fetch("/api/waik-admin/organizations", { credentials: "include" })
        if (!oRes.ok) {
          if (!cancelled) {
            setOrgsError(
              oRes.status === 403
                ? "Organizations could not load (forbidden). Your account may not be marked as WAiK super admin in the database."
                : oRes.status === 401
                  ? "Sign in required to load organizations."
                  : "Could not load organizations.",
            )
            setOrgs([])
          }
          return
        }
        const o = await oRes.json()
        if (!cancelled) setOrgs(o.organizations ?? [])
      } catch {
        if (!cancelled) {
          setOrgsError("Could not load organizations.")
          setOrgs([])
        }
      } finally {
        if (!cancelled) setOrgsLoading(false)
      }
    }
    async function loadStats() {
      setStatsError(null)
      try {
        const sRes = await fetch("/api/waik-admin/stats", { credentials: "include" })
        if (!sRes.ok) {
          if (!cancelled) setStatsError("Overview stats could not load; the table below may still show communities.")
          return
        }
        const s = await sRes.json()
        if (!cancelled) {
          setStats({
            totalOrganizations: s.totalOrganizations ?? 0,
            incidentsThisMonth: s.incidentsThisMonth ?? 0,
            mostActiveOrganizationName:
              s.mostActiveOrganizationName == null || s.mostActiveOrganizationName === ""
                ? null
                : String(s.mostActiveOrganizationName),
          })
        }
      } catch {
        if (!cancelled) setStatsError("Overview stats could not load; the table below may still show communities.")
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    async function loadFacilities() {
      setFacilitiesError(null)
      try {
        const fRes = await fetch("/api/waik-admin/communities", { credentials: "include" })
        if (!fRes.ok) {
          if (!cancelled) {
            setFacilitiesError(
              fRes.status === 403
                ? "Facilities could not load (forbidden)."
                : fRes.status === 401
                  ? "Sign in required."
                  : "Could not load facilities list.",
            )
            setFacilities([])
          }
          return
        }
        const f = (await fRes.json()) as { facilities?: FacilityRow[] }
        if (!cancelled) setFacilities(Array.isArray(f.facilities) ? f.facilities : [])
      } catch {
        if (!cancelled) {
          setFacilitiesError("Could not load facilities list.")
          setFacilities([])
        }
      } finally {
        if (!cancelled) setFacilitiesLoading(false)
      }
    }

    void loadOrgs()
    void loadStats()
    void loadFacilities()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative w-full min-h-[50vh]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1 md:space-y-8">
        <AdminBreadcrumb items={[{ label: "Super Admin" }]} />

        <WaikCard>
          <WaikCardContent className="space-y-6 p-6">
            <div>
              <CardTitle className="text-lg">Platform overview</CardTitle>
              <CardDescription className="mt-1">
                Counts are from the database. “Most active” is the org with the most incidents created this month
                (UTC), when incidents have an organization id.
              </CardDescription>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {statsLoading ? "—" : stats?.totalOrganizations ?? 0}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Total communities</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {statsLoading ? "—" : stats?.incidentsThisMonth ?? 0}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Incidents this month</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-base font-semibold leading-snug text-primary">
                  {statsLoading
                    ? "—"
                    : stats?.mostActiveOrganizationName
                      ? stats.mostActiveOrganizationName
                      : "—"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Most active (this month)</p>
              </div>
            </div>
            {statsError ? <p className="text-sm text-amber-800 dark:text-amber-200">{statsError}</p> : null}
          </WaikCardContent>
        </WaikCard>

        <PageHeader title="All facilities" description="Per-community usage and health (pilot and production)." />
        {facilitiesError ? <p className="text-sm text-destructive">{facilitiesError}</p> : null}
        <WaikCard>
          <WaikCardContent className="space-y-0 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Incidents (30d)</th>
                    <th className="px-4 py-3">Avg completeness</th>
                    <th className="px-4 py-3">Last activity</th>
                    <th className="px-4 py-3">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {facilitiesLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!facilitiesLoading && facilities.length === 0 && !facilitiesError && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No active facilities in the database.
                      </td>
                    </tr>
                  )}
                  {!facilitiesLoading &&
                    facilities.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link className="text-primary underline-offset-2 hover:underline" href={`/waik-admin/${row.id}`}>
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.state}</td>
                        <td className="px-4 py-3 tabular-nums">{row.staffCount}</td>
                        <td className="px-4 py-3 tabular-nums">{row.incidents30d}</td>
                        <td className="px-4 py-3 tabular-nums">{row.avgCompleteness30d}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.lastActivity ? new Date(row.lastActivity).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">{row.plan ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </WaikCardContent>
        </WaikCard>

        <PageHeader
          title="Pilot communities"
          description="Create and manage organizations and facilities."
          actions={
            <Button asChild className="min-h-12 font-semibold shadow-lg shadow-primary/20">
              <Link href="/waik-admin/organizations/new">New organization</Link>
            </Button>
          }
        />

        {orgsError ? <p className="text-sm text-destructive">{orgsError}</p> : null}

        <WaikCard>
          <WaikCardContent className="space-y-0 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Facilities</th>
                    <th className="px-4 py-3">Staff count</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!orgsLoading && orgs.length === 0 && !orgsError && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No communities yet. Create your first organization above. If you expected pilot data, confirm
                        this deployment uses the same MongoDB database where you ran the seed (see{" "}
                        <code className="text-xs">MONGODB_URI</code>).
                      </td>
                    </tr>
                  )}
                  {!orgsLoading &&
                    orgs.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                        <td className="px-4 py-3 tabular-nums">{row.facilityCount}</td>
                        <td className="px-4 py-3 tabular-nums">{row.staffCount}</td>
                        <td className="px-4 py-3">{row.plan}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-10 border-primary text-primary hover:bg-primary/5"
                              asChild
                            >
                              <Link href={`/waik-admin/organizations/${row.id}`}>View</Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-10 border-primary text-primary hover:bg-primary/5"
                              asChild
                            >
                              <Link href={`/waik-admin/organizations/${row.id}/facilities/new`}>Add facility</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
