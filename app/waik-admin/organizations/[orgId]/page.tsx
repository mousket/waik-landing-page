"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { brand } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"

type FacilityRow = {
  id: string
  name: string
  type: string
  state: string
  staffCount: number
}

type OrgDetail = {
  id: string
  name: string
  type: string
  plan: string
  createdAt: string
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const orgId = params.orgId as string
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [facilities, setFacilities] = useState<FacilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch(`/api/waik-admin/organizations/${orgId}`, { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) setError("Could not load organization.")
          return
        }
        if (!cancelled) {
          setOrg(data.organization)
          setFacilities(data.facilities ?? [])
        }
      } catch {
        if (!cancelled) setError("Could not load organization.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (orgId) void load()
    return () => {
      cancelled = true
    }
  }, [orgId])

  return (
    <div className="space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Super Admin", href: "/waik-admin" },
          { label: org?.name ?? "Organization" },
        ]}
      />

      <div>
        {loading && <p className="text-brand-muted">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {org && (
          <>
            <h1 className="text-2xl font-semibold text-brand-dark-teal">{org.name}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Type: {org.type} · Plan: {org.plan} · Created {new Date(org.createdAt).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-brand-dark-teal">Facilities</h2>
        <Button asChild className="min-h-[48px] font-semibold text-white" style={{ backgroundColor: brand.teal }}>
          <Link href={`/waik-admin/organizations/${orgId}/facilities/new`}>Add Facility</Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-mid-gray bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-mid-gray bg-brand-light-bg/60 text-xs font-semibold uppercase text-brand-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && facilities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-muted">
                  No facilities yet.
                </td>
              </tr>
            )}
            {facilities.map((f) => (
              <tr key={f.id} className="border-b border-brand-mid-gray/60 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-body">{f.name}</td>
                <td className="px-4 py-3 text-brand-muted">{f.type}</td>
                <td className="px-4 py-3">{f.state}</td>
                <td className="px-4 py-3 tabular-nums">{f.staffCount}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="min-h-[40px] border-brand-teal text-brand-teal" asChild>
                    <Link href={`/waik-admin/organizations/${orgId}/facilities/${f.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
