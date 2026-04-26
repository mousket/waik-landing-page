"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { brand } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"

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

export default function WaikAdminHomePage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [orgsError, setOrgsError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

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
    void loadOrgs()
    void loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Super Admin" }]} />

      <section className="rounded-xl border border-brand-mid-gray bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark-teal">WAiK Platform Overview</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Counts are from the database. “Most active” is the org with the most incidents created this month (UTC), when
          incidents have an organization id.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-brand-teal">
              {statsLoading ? "—" : stats?.totalOrganizations ?? 0}
            </p>
            <p className="mt-2 text-sm text-brand-muted">Total Communities</p>
          </div>
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-brand-teal">
              {statsLoading ? "—" : stats?.incidentsThisMonth ?? 0}
            </p>
            <p className="mt-2 text-sm text-brand-muted">Incidents This Month</p>
          </div>
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-base font-semibold leading-snug text-brand-teal">
              {statsLoading
                ? "—"
                : stats?.mostActiveOrganizationName
                  ? stats.mostActiveOrganizationName
                  : "—"}
            </p>
            <p className="mt-2 text-sm text-brand-muted">Most Active (this month)</p>
          </div>
        </div>
        {statsError ? <p className="mt-3 text-sm text-amber-800">{statsError}</p> : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <h1 className="text-xl font-semibold text-brand-dark-teal">Pilot Communities</h1>
        <Button asChild className="min-h-[48px] font-semibold text-white" style={{ backgroundColor: brand.teal }}>
          <Link href="/waik-admin/organizations/new">New Organization</Link>
        </Button>
      </div>

      {orgsError ? <p className="text-sm text-red-600">{orgsError}</p> : null}

      <div className="overflow-hidden rounded-xl border border-brand-mid-gray bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-brand-mid-gray bg-brand-light-bg/60 text-xs font-semibold uppercase text-brand-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Facilities</th>
              <th className="px-4 py-3">Staff Count</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgsLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!orgsLoading && orgs.length === 0 && !orgsError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-muted">
                  No communities yet. Create your first organization above. If you expected pilot data, confirm this
                  deployment uses the same MongoDB database where you ran the seed (see <code className="text-xs">MONGODB_URI</code>).
                </td>
              </tr>
            )}
            {!orgsLoading &&
              orgs.map((row) => (
                <tr key={row.id} className="border-b border-brand-mid-gray/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-body">{row.name}</td>
                  <td className="px-4 py-3 text-brand-muted">{row.type}</td>
                  <td className="px-4 py-3 tabular-nums">{row.facilityCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.staffCount}</td>
                  <td className="px-4 py-3">{row.plan}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" className="min-h-[40px] border-brand-teal text-brand-teal" asChild>
                        <Link href={`/waik-admin/organizations/${row.id}`}>View</Link>
                      </Button>
                      <Button variant="outline" size="sm" className="min-h-[40px] border-brand-teal text-brand-teal" asChild>
                        <Link href={`/waik-admin/organizations/${row.id}/facilities/new`}>Add Facility</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
