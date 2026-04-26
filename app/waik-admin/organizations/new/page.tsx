"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

const ORG_TYPES = [
  { value: "independent", label: "Independent" },
  { value: "snf_chain", label: "SNF chain" },
  { value: "government", label: "Government" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "other", label: "Other" },
]

export default function NewOrganizationPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState("independent")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/waik-admin/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          primaryContact: {
            name: contactName || undefined,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create organization.")
        return
      }
      const id = data.organization?.id as string | undefined
      if (id) {
        router.push(`/waik-admin/organizations/${id}/facilities/new`)
        return
      }
      setError("Unexpected response.")
    } catch {
      setError("Could not create organization.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute inset-0 -z-10 min-h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="space-y-6 py-1">
        <AdminBreadcrumb items={[{ label: "Super Admin", href: "/waik-admin" }, { label: "New organization" }]} />
        <PageHeader
          title="New organization"
          description="Create an organization, then add a facility."
        />

        <WaikCard>
          <WaikCardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="name">Organization name *</Label>
                <Input
                  id="name"
                  className="h-12 min-h-12"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Sunrise Senior Living"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  className="flex h-12 min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {ORG_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs font-medium text-muted-foreground">Primary contact (optional)</p>
              <div className="grid gap-3 sm:grid-cols-1">
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
              </div>
              <Button type="submit" className="w-full min-h-12 sm:w-auto" disabled={submitting}>
                {submitting ? "Creating…" : "Create organization"}
              </Button>
            </form>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
