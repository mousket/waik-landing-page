"use client"

import { useCallback, useEffect, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { BUILTIN_INCIDENT_TYPE_IDS, builtinIncidentTypeLabel } from "@/lib/facility-builtin-incident-types"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { NOTIFY_ROLE_SLUGS, NOTIFY_ROLE_LABELS, type MergedNotificationPrefs } from "@/lib/notification-prefs"
import { PageHeader } from "@/components/ui/page-header"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const DAYS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
]

export default function AdminSettingsNotificationsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = getAdminContextQueryString(searchParams)
  const [p, setP] = useState<MergedNotificationPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/notification-preferences${apiCtx}`)
      if (!r.ok) throw new Error("load")
      setP((await r.json()) as MergedNotificationPrefs)
    } catch {
      toast.error("Could not load")
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !p) {
    return (
      <div className="flex min-h-[30vh] justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:py-8">
        <PageHeader title="Notifications" description="Who is notified by incident and phase. Saved per facility." />
        <WaikCard>
          <WaikCardContent className="space-y-2 p-6 text-sm text-muted-foreground">
            <CardTitle className="text-foreground">Device and PHI (read only)</CardTitle>
            <ul className="list-inside list-disc space-y-1 pr-2">
              <li>
                Personal device: room number only (e.g. &ldquo;Fall incident started &mdash; Room 204&rdquo;)
              </li>
              <li>Work device: full details (e.g. &ldquo;Fall incident started &mdash; name, room&rdquo;)</li>
              <li>Work email: full details and link to the incident</li>
            </ul>
            <p>Staff set their device type on their profile (device type in WAiK user settings).</p>
          </WaikCardContent>
        </WaikCard>
        {BUILTIN_INCIDENT_TYPE_IDS.map((id) => (
          <WaikCard key={id}>
            <WaikCardContent className="space-y-4 p-6">
              <CardTitle className="text-base">{builtinIncidentTypeLabel(id)}</CardTitle>
              <p className="text-xs font-semibold uppercase text-muted-foreground">When incident starts</p>
              <div className="space-y-2 pl-1">
                {NOTIFY_ROLE_SLUGS.map((slug) => (
                  <div key={slug} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${id}-s-${slug}`}>{NOTIFY_ROLE_LABELS[slug]}</Label>
                    <Switch
                      id={`${id}-s-${slug}`}
                      checked={p.perIncident[id].whenStarted[slug] !== false}
                      onCheckedChange={(c) => {
                        setP((o) => {
                          if (!o) return o
                          const n = { ...o, perIncident: { ...o.perIncident } }
                          n.perIncident[id] = { ...n.perIncident[id] }
                          n.perIncident[id].whenStarted = { ...n.perIncident[id].whenStarted, [slug]: c }
                          return n
                        })
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">When Phase 1 signed</p>
              <div className="space-y-2 pl-1">
                {NOTIFY_ROLE_SLUGS.map((slug) => (
                  <div key={slug} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${id}-p-${slug}`}>{NOTIFY_ROLE_LABELS[slug]}</Label>
                    <Switch
                      id={`${id}-p-${slug}`}
                      checked={p.perIncident[id].whenPhase1Signed[slug] !== false}
                      onCheckedChange={(c) => {
                        setP((o) => {
                          if (!o) return o
                          const n = { ...o, perIncident: { ...o.perIncident } }
                          n.perIncident[id] = { ...n.perIncident[id] }
                          n.perIncident[id].whenPhase1Signed = { ...n.perIncident[id].whenPhase1Signed, [slug]: c }
                          return n
                        })
                      }}
                    />
                  </div>
                ))}
              </div>
            </WaikCardContent>
          </WaikCard>
        ))}
        <WaikCard>
          <WaikCardContent className="space-y-4 p-6">
            <CardTitle>Global preferences</CardTitle>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Daily brief (DON/Admin)</p>
                  <CardDescription>Email summary time (local, HH:MM 24h)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.global.dailyBrief.enabled}
                    onCheckedChange={(c) =>
                      setP((o) => (o ? { ...o, global: { ...o.global, dailyBrief: { ...o.global.dailyBrief, enabled: c } } } : o))
                    }
                  />
                  <input
                    className="h-9 w-24 rounded border border-border bg-background px-2 text-sm"
                    value={p.global.dailyBrief.timeLocal}
                    onChange={(e) =>
                      setP((o) =>
                        o
                          ? { ...o, global: { ...o.global, dailyBrief: { ...o.global.dailyBrief, timeLocal: e.target.value } } }
                          : o,
                      )
                    }
                    aria-label="Daily brief time"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Weekly intelligence report</p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.global.weeklyIntelligence.enabled}
                    onCheckedChange={(c) =>
                      setP((o) =>
                        o
                          ? {
                              ...o,
                              global: {
                                ...o.global,
                                weeklyIntelligence: { ...o.global.weeklyIntelligence, enabled: c },
                              },
                            }
                          : o,
                      )
                    }
                  />
                  <select
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    value={p.global.weeklyIntelligence.dayOfWeek}
                    onChange={(e) =>
                      setP((o) =>
                        o
                          ? {
                              ...o,
                              global: {
                                ...o.global,
                                weeklyIntelligence: { ...o.global.weeklyIntelligence, dayOfWeek: e.target.value },
                              },
                            }
                          : o,
                      )
                    }
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Overdue Phase 2 alert</p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.global.overduePhase2.enabled}
                    onCheckedChange={(c) =>
                      setP((o) => (o ? { ...o, global: { ...o.global, overduePhase2: { ...o.global.overduePhase2, enabled: c } } } : o))
                    }
                  />
                  <input
                    className="h-9 w-20 rounded border border-border bg-background px-2 text-sm"
                    type="number"
                    min={1}
                    value={p.global.overduePhase2.hours}
                    onChange={(e) =>
                      setP((o) =>
                        o
                          ? {
                              ...o,
                              global: {
                                ...o.global,
                                overduePhase2: {
                                  ...o.global.overduePhase2,
                                  hours: Number(e.target.value) || 24,
                                },
                              },
                            }
                          : o,
                      )
                    }
                    aria-label="Overdue hours"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Assessment due reminders</p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.global.assessmentReminders.enabled}
                    onCheckedChange={(c) =>
                      setP((o) =>
                        o
                          ? {
                              ...o,
                              global: {
                                ...o.global,
                                assessmentReminders: { ...o.global.assessmentReminders, enabled: c },
                              },
                            }
                          : o,
                      )
                    }
                  />
                  <input
                    className="h-9 w-16 rounded border border-border bg-background px-2 text-sm"
                    type="number"
                    min={0}
                    value={p.global.assessmentReminders.daysBefore}
                    onChange={(e) =>
                      setP((o) =>
                        o
                          ? {
                              ...o,
                              global: {
                                ...o.global,
                                assessmentReminders: {
                                  ...o.global.assessmentReminders,
                                  daysBefore: Number(e.target.value) || 1,
                                },
                              },
                            }
                          : o,
                      )
                    }
                    aria-label="Days before due"
                  />
                </div>
              </div>
            </div>
          </WaikCardContent>
        </WaikCard>
        <Button
          className="min-h-12 w-full"
          onClick={async () => {
            if (!p) return
            setSaving(true)
            try {
              const r = await fetch(`/api/admin/notification-preferences${apiCtx}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(p),
              })
              if (!r.ok) {
                throw new Error("x")
              }
              setP((await r.json()) as MergedNotificationPrefs)
              toast.success("Notification preferences saved")
            } catch {
              toast.error("Save failed")
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  )
}
