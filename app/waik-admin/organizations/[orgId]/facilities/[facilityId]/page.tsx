"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

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
    <div className="relative w-full min-h-[50vh]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1 md:space-y-8">
        <AdminBreadcrumb
          items={[
            { label: "Super Admin", href: "/waik-admin" },
            { label: orgName || "Organization", href: `/waik-admin/organizations/${orgId}` },
            { label: facility?.name ?? "Facility" },
          ]}
        />

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{error}</p>}

        {facility && !loading && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{facility.name}</h1>
              <Badge variant="outline" className="border-primary text-primary">
                {facility.type}
              </Badge>
              <Badge variant="secondary">{facility.state}</Badge>
              <Badge
                className={facility.plan === "enterprise" ? "bg-slate-700 text-white" : "bg-primary text-primary-foreground"}
              >
                {facility.plan}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground md:text-base">
              Onboarding:{" "}
              {facility.onboardingDate
                ? format(new Date(facility.onboardingDate), "MMM d, yyyy")
                : "—"}
            </p>
          </div>
        )}

        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              Staff
              <Badge variant="secondary" className="font-normal">
                {staff.length}
              </Badge>
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild variant="outline" className="min-h-12 border-primary text-primary hover:bg-primary/5">
                <Link
                  href={`/admin/dashboard?organizationId=${encodeURIComponent(orgId)}&facilityId=${encodeURIComponent(
                    facilityId,
                  )}`}
                >
                  Open admin dashboard
                </Link>
              </Button>
              <Button asChild className="min-h-12 font-semibold shadow-lg shadow-primary/20">
                <Link href={`/waik-admin/organizations/${orgId}/facilities/${facilityId}/create-admin`}>
                  Create administrator
                </Link>
              </Button>
            </div>
          }
        />

        <WaikCard>
          <WaikCardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && staff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No staff yet. Create the first administrator below.
                      </td>
                    </tr>
                  )}
                  {staff.map((s, i) => (
                    <tr
                      key={`${s.email}-${i}`}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3">{roleLabel[s.roleSlug] ?? s.roleSlug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            staffStatus(s) === "Pending" ? "font-medium text-amber-600" : "text-emerald-700"
                          }
                        >
                          {staffStatus(s)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.lastLoginAt ? format(new Date(s.lastLoginAt), "MMM d, yyyy h:mm a") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WaikCardContent>
        </WaikCard>

        <WaikCard>
          <details className="group p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Facility settings
                <span className="text-xs font-normal text-muted-foreground group-open:hidden">(expand)</span>
              </span>
            </summary>
            {facility ? (
              <div className="mt-4 space-y-2 border-t border-border/50 pt-4 text-sm">
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
                  <span className="font-medium">Units:</span> {facility.units?.length ? facility.units.join(", ") : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Editing lives in facility admin settings (pilot).</p>
              </div>
            ) : null}
          </details>
        </WaikCard>
      </div>
    </div>
  )
}
