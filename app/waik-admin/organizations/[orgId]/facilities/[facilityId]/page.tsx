"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { brand } from "@/lib/design-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type StaffRow = {
  firstName?: string
  lastName?: string
  email: string
  roleSlug: string
  isActive: boolean
  clerkUserId?: string
  lastLoginAt?: string
}

const roleLabel: Record<string, string> = {
  administrator: "Administrator",
  owner: "Owner",
  director_of_nursing: "Director of Nursing",
  head_nurse: "Head Nurse",
  rn: "RN",
  lpn: "LPN",
  cna: "CNA",
  staff: "Staff",
  physical_therapist: "Physical Therapist",
  dietician: "Dietician",
}

export default function FacilityDetailPage() {
  const params = useParams()
  const orgId = params.orgId as string
  const facilityId = params.facilityId as string

  const [orgName, setOrgName] = useState<string>("")
  const [facility, setFacility] = useState<{
    name: string
    type: string
    state: string
    bedCount?: number
    units: string[]
    plan: string
    onboardingDate?: string
    reportingConfig?: { mandatedReportingWindowHours?: number }
    phaseMode?: string
  } | null>(null)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch(`/api/waik-admin/organizations/${orgId}/facilities/${facilityId}`, {
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) setError("Could not load facility.")
          return
        }
        if (!cancelled) {
          setOrgName(data.organization?.name ?? "")
          setFacility(data.facility)
          setStaff(data.staff ?? [])
        }
      } catch {
        if (!cancelled) setError("Could not load facility.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId, facilityId])

  function staffStatus(s: StaffRow): "Active" | "Pending" {
    return s.clerkUserId ? "Active" : "Pending"
  }

  return (
    <div className="space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Super Admin", href: "/waik-admin" },
          { label: orgName || "Organization", href: `/waik-admin/organizations/${orgId}` },
          { label: facility?.name ?? "Facility" },
        ]}
      />

      <div>
        {loading && <p className="text-brand-muted">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {facility && (
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-brand-dark-teal">{facility.name}</h1>
              <Badge variant="outline" className="border-brand-teal text-brand-teal">
                {facility.type}
              </Badge>
              <Badge variant="secondary">{facility.state}</Badge>
              <Badge
                className={
                  facility.plan === "enterprise" ? "bg-slate-700 text-white" : "bg-brand-teal text-white"
                }
              >
                {facility.plan}
              </Badge>
            </div>
            <p className="text-sm text-brand-muted">
              Onboarding:{" "}
              {facility.onboardingDate
                ? format(new Date(facility.onboardingDate), "MMM d, yyyy")
                : "—"}
            </p>
          </header>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-dark-teal">
          Staff
          <Badge variant="secondary" className="font-normal">
            {staff.length}
          </Badge>
        </h2>
        <Button asChild className="min-h-[48px] font-semibold text-white" style={{ backgroundColor: brand.teal }}>
          <Link href={`/waik-admin/organizations/${orgId}/facilities/${facilityId}/create-admin`}>
            Create Administrator
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-mid-gray bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-mid-gray bg-brand-light-bg/60 text-xs font-semibold uppercase text-brand-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-muted">
                  No staff yet. Create the first administrator below.
                </td>
              </tr>
            )}
            {staff.map((s, i) => (
              <tr key={`${s.email}-${i}`} className="border-b border-brand-mid-gray/60 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-body">
                  {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-3">{roleLabel[s.roleSlug] ?? s.roleSlug}</td>
                <td className="px-4 py-3 text-brand-muted">{s.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      staffStatus(s) === "Pending" ? "font-medium text-amber-600" : "text-emerald-700"
                    }
                  >
                    {staffStatus(s)}
                  </span>
                </td>
                <td className="px-4 py-3 text-brand-muted">
                  {s.lastLoginAt ? format(new Date(s.lastLoginAt), "MMM d, yyyy h:mm a") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-brand-dark-teal">
          Facility Settings
        </summary>
        {facility ? (
          <div className="mt-4 space-y-2 border-t border-brand-mid-gray/60 pt-4 text-sm text-brand-body">
            <p>
              <span className="font-medium">Bed count:</span> {facility.bedCount ?? "—"}
            </p>
            <p>
              <span className="font-medium">Mandated reporting window:</span>{" "}
              {facility.reportingConfig?.mandatedReportingWindowHours ?? 2} hours
            </p>
            <p>
              <span className="font-medium">Phase mode:</span> {facility.phaseMode?.replace("_", " ") ?? "—"}
            </p>
            <p>
              <span className="font-medium">Units:</span>{" "}
              {facility.units?.length ? facility.units.join(", ") : "—"}
            </p>
            <p className="text-xs text-brand-muted">Editing lives in facility admin settings (pilot).</p>
          </div>
        ) : null}
      </details>
    </div>
  )
}
