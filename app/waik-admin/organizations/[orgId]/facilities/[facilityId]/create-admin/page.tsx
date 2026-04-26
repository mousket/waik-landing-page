"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

export default function CreateAdminPage() {
  const params = useParams()
  const orgId = params.orgId as string
  const facilityId = params.facilityId as string

  const [orgName, setOrgName] = useState("")
  const [facilityName, setFacilityName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/waik-admin/organizations/${orgId}/facilities/${facilityId}`, {
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        if (data.organization?.name) setOrgName(data.organization.name)
        if (data.facility?.name) setFacilityName(data.facility.name)
      } catch {
        /* ignore */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId, facilityId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/waik-admin/organizations/${orgId}/facilities/${facilityId}/admins`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError(typeof data.error === "string" ? data.error : "A user with this email already exists")
        return
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create administrator.")
        return
      }
      setSuccess({ name: `${firstName} ${lastName}`.trim(), email: email.trim().toLowerCase() })
      setFirstName("")
      setLastName("")
      setEmail("")
    } catch {
      setError("Could not create administrator.")
    } finally {
      setSubmitting(false)
    }
  }

  function createAnother() {
    setSuccess(null)
    setError(null)
  }

  if (success) {
    return (
      <div className="relative mx-auto w-full max-w-lg">
        <div className="absolute inset-0 -z-10 min-h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="space-y-6 py-1">
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            <h2 className="text-lg font-semibold">Administrator created successfully.</h2>
            <p className="mt-2 text-sm">
              {success.name} ({success.email})
            </p>
            <p className="mt-2 text-sm">A welcome email was sent to {success.email} with their temporary password.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="min-h-12" variant="secondary" onClick={createAnother}>
              Create another administrator
            </Button>
            <Button type="button" className="min-h-12" asChild>
              <Link href="/waik-admin">Go to super admin</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute inset-0 -z-10 min-h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1">
        <AdminBreadcrumb
          items={[
            { label: "Super Admin", href: "/waik-admin" },
            { label: orgName || "Organization", href: `/waik-admin/organizations/${orgId}` },
            { label: facilityName || "Facility", href: `/waik-admin/organizations/${orgId}/facilities/${facilityId}` },
            { label: "Create administrator" },
          ]}
        />
        <PageHeader
          title="Create first administrator"
          description={
            <>
              This person will have full control of <strong>{facilityName || "this facility"}</strong>. They will
              receive a welcome email with their temporary credentials.
            </>
          }
        />

        <WaikCard>
          <WaikCardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  className="h-12 min-h-12"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  className="h-12 min-h-12"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  className="h-12 min-h-12"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full min-h-12 sm:w-auto">
                {submitting ? "Creating account and sending email…" : "Create administrator & send welcome email"}
              </Button>
            </form>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
