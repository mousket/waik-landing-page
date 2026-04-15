"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminBreadcrumb } from "@/components/admin/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    <div className="mx-auto max-w-lg space-y-6">
      <AdminBreadcrumb items={[{ label: "Super Admin", href: "/waik-admin" }, { label: "New Organization" }]} />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">New Organization</h1>
        <p className="mt-1 text-sm text-zinc-600">Create an organization, then add a facility.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="name">Organization name *</Label>
          <Input
            id="name"
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
        <p className="text-xs font-medium text-zinc-500">Primary contact (optional)</p>
        <div className="grid gap-3 sm:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cemail">Email</Label>
            <Input id="cemail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cphone">Phone</Label>
            <Input id="cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
          {submitting ? "Creating…" : "Create Organization"}
        </Button>
      </form>
    </div>
  )
}
