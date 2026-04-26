"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Building2, Loader2 } from "lucide-react"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

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
    <div className="relative w-full min-h-[50vh]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1 md:space-y-8">
        <AdminBreadcrumb
          items={[
            { label: "Super Admin", href: "/waik-admin" },
            { label: org?.name ?? "Organization" },
          ]}
        />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Loading organization…
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}

        {org && !loading && (
          <PageHeader
            title={org.name}
            description={`Type: ${org.type} · Plan: ${org.plan} · Created ${new Date(org.createdAt).toLocaleDateString()}`}
            actions={
              facilities.length > 0 ? (
                <Button
                  asChild
                  variant="outline"
                  className="min-h-12 border-primary text-primary hover:bg-primary/5"
                >
                  <Link
                    href={
                      facilities.length === 1
                        ? `/admin/dashboard?organizationId=${encodeURIComponent(orgId)}&facilityId=${encodeURIComponent(
                            facilities[0]!.id,
                          )}`
                        : `/admin/dashboard?organizationId=${encodeURIComponent(orgId)}`
                    }
                  >
                    Open admin dashboard
                  </Link>
                </Button>
              ) : (
                <div className="text-right">
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="min-h-12 border-border text-muted-foreground"
                    title="Add at least one facility before opening the community admin dashboard"
                  >
                    Open admin dashboard
                  </Button>
                  <p className="mt-1 max-w-[16rem] text-right text-xs text-muted-foreground sm:max-w-xs">
                    Add a facility first — the admin app needs a facility to scope to.
                  </p>
                </div>
              )
            }
          />
        )}

        <PageHeader
          title="Facilities"
          actions={
            <Button asChild className="min-h-12 font-semibold shadow-lg shadow-primary/20">
              <Link href={`/waik-admin/organizations/${orgId}/facilities/new`}>Add facility</Link>
            </Button>
          }
        />

        {loading ? (
          <div className="space-y-3" aria-hidden>
            <div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-muted/50" />
            <div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-muted/40" />
            <div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-muted/30" />
          </div>
        ) : error ? null : facilities.length === 0 ? (
          <WaikCard>
            <WaikCardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <Building2 className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No facilities yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                This organization does not have any facilities. Create one to assign staff, then open the community admin
                dashboard to view analytics and incidents.
              </p>
              <Button asChild className="mt-6 min-h-12 font-semibold shadow-lg shadow-primary/20">
                <Link href={`/waik-admin/organizations/${orgId}/facilities/new`}>Add your first facility</Link>
              </Button>
            </WaikCardContent>
          </WaikCard>
        ) : (
          <WaikCard>
            <WaikCardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{f.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.type}</td>
                        <td className="px-4 py-3">{f.state}</td>
                        <td className="px-4 py-3 tabular-nums">{f.staffCount}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-10 border-primary text-primary hover:bg-primary/5"
                            asChild
                          >
                            <Link href={`/waik-admin/organizations/${orgId}/facilities/${f.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WaikCardContent>
          </WaikCard>
        )}
      </div>
    </div>
  )
}
