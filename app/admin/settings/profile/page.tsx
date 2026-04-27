"use client"

import { useCallback, useEffect, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { US_STATE_OPTIONS } from "@/lib/us-states"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type F = {
  name: string
  type: string
  state: string
  bedCount?: number
  primaryContact: { name: string; email: string; phone: string }
  reportingConfig: { mandatedReportingWindowHours: number }
  plan: string
  id: string
  onboardingDate: string | null
}

export default function AdminSettingsProfilePage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = getAdminContextQueryString(searchParams)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState<Partial<F>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/facility${apiCtx}`)
      if (!res.ok) throw new Error("load")
      const j = (await res.json()) as { facility: F }
      setF(j.facility)
    } catch {
      toast.error("Could not load facility")
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/facility${apiCtx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? "Save failed")
      }
      toast.success("Settings saved")
      const j = (await res.json()) as { facility: F }
      setF(j.facility)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:py-8">
        <PageHeader title="Community profile" description="Update how this community appears in WAiK and reporting." />
        <form onSubmit={onSubmit} className="space-y-6">
          <WaikCard>
            <WaikCardContent className="space-y-4 p-6">
              <div>
                <CardTitle>Community</CardTitle>
                <CardDescription>How staff see this home in the product.</CardDescription>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Community name</Label>
                <Input
                  id="name"
                  value={f.name ?? ""}
                  onChange={(e) => setF((o) => ({ ...o, name: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facility type</Label>
                  <Select value={f.type} onValueChange={(v) => setF((o) => ({ ...o, type: v }))}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["snf", "alf", "memory_care", "ccrc", "other"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={f.state} onValueChange={(v) => setF((o) => ({ ...o, state: v }))}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {US_STATE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed">Bed count</Label>
                <Input
                  id="bed"
                  type="number"
                  min={0}
                  className="h-11"
                  value={f.bedCount ?? ""}
                  onChange={(e) =>
                    setF((o) => ({ ...o, bedCount: e.target.value ? Number(e.target.value) : undefined }))
                  }
                />
              </div>
            </WaikCardContent>
          </WaikCard>

          <WaikCard>
            <WaikCardContent className="space-y-4 p-6">
              <CardTitle>Primary contact</CardTitle>
              <div className="space-y-2">
                <Label htmlFor="pcn">Name</Label>
                <Input
                  id="pcn"
                  value={f.primaryContact?.name ?? ""}
                  onChange={(e) =>
                    setF((o) => ({
                      ...o,
                      primaryContact: { ...(o.primaryContact ?? { name: "", email: "", phone: "" }), name: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pce">Email</Label>
                <Input
                  id="pce"
                  type="email"
                  value={f.primaryContact?.email ?? ""}
                  onChange={(e) =>
                    setF((o) => ({
                      ...o,
                      primaryContact: { ...(o.primaryContact ?? { name: "", email: "", phone: "" }), email: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcp">Phone</Label>
                <Input
                  id="pcp"
                  value={f.primaryContact?.phone ?? ""}
                  onChange={(e) =>
                    setF((o) => ({
                      ...o,
                      primaryContact: { ...(o.primaryContact ?? { name: "", email: "", phone: "" }), phone: e.target.value },
                    }))
                  }
                />
              </div>
            </WaikCardContent>
          </WaikCard>

          <WaikCard>
            <WaikCardContent className="space-y-4 p-6">
              <div>
                <CardTitle>Reporting & safety</CardTitle>
                <CardDescription>Mandated reporting window (hours) from discovery.</CardDescription>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mwr">Mandated reporting window (hours)</Label>
                <Input
                  id="mwr"
                  type="number"
                  min={1}
                  max={72}
                  className="h-11 w-32"
                  value={f.reportingConfig?.mandatedReportingWindowHours ?? 2}
                  onChange={(e) =>
                    setF((o) => ({
                      ...o,
                      reportingConfig: {
                        mandatedReportingWindowHours: Number(e.target.value) || 2,
                      },
                    }))
                  }
                />
              </div>
            </WaikCardContent>
          </WaikCard>

          <WaikCard>
            <WaikCardContent className="space-y-2 p-6">
              <CardTitle>Read only</CardTitle>
              <p className="text-sm text-muted-foreground">
                WAiK plan: <span className="font-medium text-foreground">{(f.plan as string) ?? "—"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Facility ID: <span className="font-mono font-medium text-foreground">{f.id}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Onboarding date:{" "}
                <span className="font-medium text-foreground">
                  {f.onboardingDate ? new Date(f.onboardingDate).toLocaleString() : "—"}
                </span>
              </p>
            </WaikCardContent>
          </WaikCard>

          <Button type="submit" className="min-h-12 w-full sm:w-auto" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save profile
          </Button>
        </form>
      </div>
    </div>
  )
}
