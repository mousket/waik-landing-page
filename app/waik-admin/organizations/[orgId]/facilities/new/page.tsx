"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { US_STATE_OPTIONS } from "@/lib/us-states"

const FACILITY_TYPES = [
  { value: "snf", label: "Skilled Nursing (SNF)" },
  { value: "alf", label: "Assisted Living (ALF)" },
  { value: "memory_care", label: "Memory Care" },
  { value: "ccrc", label: "CCRC" },
  { value: "other", label: "Other" },
]

export default function NewFacilityPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.orgId as string

  const [orgName, setOrgName] = useState("")

  const [name, setName] = useState("")
  const [type, setType] = useState("alf")
  const [state, setState] = useState("MN")
  const [bedCount, setBedCount] = useState("")
  const [units, setUnits] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/waik-admin/organizations/${orgId}`, { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        if (data.organization?.name) setOrgName(data.organization.name)
      } catch {
        /* ignore */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/waik-admin/organizations/${orgId}/facilities`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          state,
          bedCount: bedCount ? Number(bedCount) : undefined,
          units,
          primaryContact: {
            name: contactName || undefined,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create facility.")
        return
      }
      const facilityId = data.facility?.id as string | undefined
      if (facilityId) {
        router.push(`/waik-admin/organizations/${orgId}/facilities/${facilityId}/create-admin`)
        return
      }
      setError("Unexpected response.")
    } catch {
      setError("Could not create facility.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute inset-0 -z-10 min-h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1">
        <AdminBreadcrumb
          items={[
            { label: "Super Admin", href: "/waik-admin" },
            { label: orgName || "Organization", href: `/waik-admin/organizations/${orgId}` },
            { label: "New facility" },
          ]}
        />
        <PageHeader
          title="New facility"
          description="Pilot: one organization typically has one facility."
        />

        <WaikCard>
          <WaikCardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="name">Facility name *</Label>
                <Input
                  id="name"
                  className="h-12 min-h-12"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Sunrise Minneapolis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftype">Type *</Label>
                <select
                  id="ftype"
                  className="flex h-12 min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {FACILITY_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  className="flex h-12 min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {US_STATE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.value})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="beds">Bed count</Label>
                <Input
                  id="beds"
                  className="h-12 min-h-12"
                  type="number"
                  min={0}
                  value={bedCount}
                  onChange={(e) => setBedCount(e.target.value)}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="units">Units / wings</Label>
                <Input
                  id="units"
                  className="h-12 min-h-12"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="Wing A, Wing B, Memory Care"
                />
                <p className="text-xs text-muted-foreground">Enter unit or wing names separated by commas.</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">Primary contact (optional)</p>
              <div className="space-y-2">
                <Label htmlFor="cname">Name</Label>
                <Input
                  id="cname"
                  className="h-12 min-h-12"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cemail">Email</Label>
                <Input
                  id="cemail"
                  className="h-12 min-h-12"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Phone</Label>
                <Input
                  id="cphone"
                  className="h-12 min-h-12"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <Button type="submit" className="min-h-12" disabled={submitting}>
                {submitting ? "Creating…" : "Create facility"}
              </Button>
            </form>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
