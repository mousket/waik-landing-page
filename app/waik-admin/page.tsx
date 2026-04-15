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

export default function WaikAdminHomePage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const oRes = await fetch("/api/waik-admin/organizations", { credentials: "include" })
        if (!oRes.ok) {
          if (!cancelled) setError("Could not load data.")
          return
        }
        const o = await oRes.json()
        if (!cancelled) {
          setOrgs(o.organizations ?? [])
        }
      } catch {
        if (!cancelled) setError("Could not load data.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Super Admin" }]} />

      <section className="rounded-xl border border-brand-mid-gray bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark-teal">WAiK Platform Overview</h2>
        <p className="mt-1 text-sm text-brand-muted">Placeholder metrics — live intelligence wiring comes in a later phase.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-brand-teal">2</p>
            <p className="mt-2 text-sm text-brand-muted">Total Communities</p>
          </div>
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-brand-teal">28</p>
            <p className="mt-2 text-sm text-brand-muted">Incidents This Month</p>
          </div>
          <div className="rounded-lg bg-brand-light-bg/80 p-4 text-center">
            <p className="text-base font-semibold leading-snug text-brand-teal">Sunrise Minneapolis</p>
            <p className="mt-2 text-sm text-brand-muted">Most Active</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <h1 className="text-xl font-semibold text-brand-dark-teal">Pilot Communities</h1>
        <Button asChild className="min-h-[48px] font-semibold text-white" style={{ backgroundColor: brand.teal }}>
          <Link href="/waik-admin/organizations/new">New Organization</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-muted">
                  No communities yet. Create your first organization above.
                </td>
              </tr>
            )}
            {!loading &&
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
