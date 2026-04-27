"use client"

import { useCallback, useEffect, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { BUILTIN_INCIDENT_TYPE_IDS, builtinIncidentTypeLabel } from "@/lib/facility-builtin-incident-types"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { getBuiltinGoldStandardItems } from "@/lib/gold-standards-builtin"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type GoldField = { id: string; name: string; type: string; required: boolean }
type F = {
  id: string
  phaseMode: "two_phase" | "one_phase"
  completionThresholds: Record<string, number>
  goldStandardCustom: Record<string, { customFields: GoldField[] }> | null
  incidentTypeSettings: { customTypes: { id: string; name: string; description: string; active: boolean }[] } | null
}

function newId() {
  return `cf-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`
}

export default function AdminSettingsIncidentsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = getAdminContextQueryString(searchParams)
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState<Partial<F>>({ completionThresholds: {} })
  const [threshDraft, setThreshDraft] = useState<Record<string, string>>({})

  const [phaseModal, setPhaseModal] = useState<null | { next: "one_phase" | "two_phase" }>(null)
  const [goldOpen, setGoldOpen] = useState<string | null>(null)
  const [customForm, setCustomForm] = useState({ name: "", description: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/facility${apiCtx}`)
      if (!res.ok) throw new Error("load")
      const j = (await res.json()) as { facility: F }
      setF(j.facility)
      const d: Record<string, string> = {}
      for (const k of BUILTIN_INCIDENT_TYPE_IDS) {
        d[k] = String(j.facility.completionThresholds?.[k] ?? "")
      }
      setThreshDraft(d)
    } catch {
      toast.error("Could not load")
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  const twoMode = f.phaseMode !== "one_phase"

  async function savePhase(next: "one_phase" | "two_phase") {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/facility${apiCtx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseMode: next }),
      })
      if (!res.ok) throw new Error("save")
      setF((o) => ({ ...o, phaseMode: next }))
      toast.success("Phase mode updated")
    } catch {
      toast.error("Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function saveThresholds() {
    const th: Record<string, number> = {}
    for (const k of BUILTIN_INCIDENT_TYPE_IDS) {
      const raw = Number(threshDraft[k])
      if (Number.isNaN(raw) || raw < 60 || raw > 95) {
        toast.error(`Threshold for ${k} must be between 60 and 95`)
        return
      }
      th[k] = Math.round(raw)
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/facility/thresholds${apiCtx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds: th }),
      })
      if (!res.ok) throw new Error("save")
      const j = (await res.json()) as { completionThresholds: Record<string, number> }
      setF((o) => ({ ...o, completionThresholds: j.completionThresholds }))
      toast.success("Thresholds saved")
    } catch {
      toast.error("Could not save thresholds")
    } finally {
      setSaving(false)
    }
  }

  function newCustomType() {
    if (!customForm.name.trim()) {
      toast.error("Name required")
      return
    }
    const list = f.incidentTypeSettings?.customTypes ?? []
    setF((o) => ({
      ...o,
      incidentTypeSettings: {
        customTypes: [
          ...list,
          {
            id: newId(),
            name: customForm.name.trim(),
            description: customForm.description.trim(),
            active: true,
          },
        ],
      },
    }))
    setCustomForm({ name: "", description: "" })
  }

  async function saveCustomTypes() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/facility/incident-types${apiCtx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTypes: f.incidentTypeSettings?.customTypes ?? [] }),
      })
      if (!res.ok) throw new Error("save")
      const j = (await res.json()) as { customTypes: { id: string; name: string; description: string; active: boolean }[] }
      setF((o) => ({ ...o, incidentTypeSettings: { customTypes: j.customTypes } }))
      toast.success("Incident types updated")
    } catch {
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
        <PageHeader title="Incident configuration" description="Two-phase default, completion bars, and Gold Standards." />
        <WaikCard>
          <WaikCardContent className="space-y-4 p-6">
            <div>
              <CardTitle>Two-phase investigation</CardTitle>
              <CardDescription>When on, staff complete Phase 1 then leadership runs Phase 2. Default: on.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">Two-phase mode {twoMode ? "on" : "off (single-phase)"}</p>
              <Switch
                checked={twoMode}
                onCheckedChange={(c: boolean) => {
                  if (c) {
                    if (f.phaseMode === "one_phase") {
                      setPhaseModal({ next: "two_phase" })
                    }
                  } else {
                    if (f.phaseMode !== "one_phase") {
                      setPhaseModal({ next: "one_phase" })
                    }
                  }
                }}
              />
            </div>
          </WaikCardContent>
        </WaikCard>

        <WaikCard>
          <WaikCardContent className="space-y-4 p-6">
            <CardTitle>Phase 1 completion threshold</CardTitle>
            <CardDescription>Range 60–95%.</CardDescription>
            {BUILTIN_INCIDENT_TYPE_IDS.map((k) => (
              <div key={k} className="space-y-1">
                <Label>
                  {builtinIncidentTypeLabel(k)} — {threshDraft[k] ?? f.completionThresholds?.[k] ?? 75}%
                </Label>
                <p className="text-xs text-muted-foreground">Staff cannot submit a Phase 1 report below this threshold.</p>
                <Input
                  className="max-w-32 h-10"
                  type="number"
                  min={60}
                  max={95}
                  value={threshDraft[k] ?? ""}
                  onChange={(e) => setThreshDraft((d) => ({ ...d, [k]: e.target.value }))}
                />
              </div>
            ))}
            <Button type="button" onClick={saveThresholds} disabled={saving} className="min-h-12">
              Save thresholds
            </Button>
          </WaikCardContent>
        </WaikCard>

        <WaikCard>
          <WaikCardContent className="space-y-4 p-6">
            <CardTitle>Gold Standards</CardTitle>
            {BUILTIN_INCIDENT_TYPE_IDS.map((id) => (
              <div key={id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{builtinIncidentTypeLabel(id)}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setGoldOpen(id)}>
                  View and edit
                </Button>
              </div>
            ))}
            <Separator />
            {f.incidentTypeSettings?.customTypes?.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded-xl p-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description || "—"}</p>
                </div>
                <Badge>{c.active ? "On" : "Off"}</Badge>
              </div>
            ))}
            <p className="text-sm text-muted-foreground">Default system types (above) are always on for reporting.</p>
            <div className="space-y-2 max-w-md">
              <Input
                placeholder="New custom type name"
                value={customForm.name}
                onChange={(e) => setCustomForm((s) => ({ ...s, name: e.target.value }))}
              />
              <Input
                placeholder="Description (optional)"
                value={customForm.description}
                onChange={(e) => setCustomForm((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={newCustomType}>
                  Add custom type
                </Button>
                {(f.incidentTypeSettings?.customTypes?.length ?? 0) > 0 ? (
                  <Button type="button" onClick={saveCustomTypes} disabled={saving} className="min-h-12">
                    Save custom types
                  </Button>
                ) : null}
              </div>
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>

      <Dialog open={Boolean(phaseModal)} onOpenChange={() => !saving && setPhaseModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {phaseModal?.next === "one_phase" ? "Before you switch to single-phase mode" : "Switch to two-phase mode?"}
            </DialogTitle>
          </DialogHeader>
          {phaseModal?.next === "one_phase" ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Single-phase mode means incident reports close after Phase 1 only — no formal leadership investigation,
              root cause analysis, or intervention documentation. This reduces administrative burden but may not meet
              state regulatory requirements. Most communities using WAiK operate in two-phase mode. Are you sure you
              want to proceed?
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Two-phase mode is the default for most communities.</p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            {phaseModal?.next === "one_phase" ? (
              <>
                <Button variant="outline" onClick={() => setPhaseModal(null)}>
                  Keep two-phase mode
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      setPhaseModal(null)
                      await savePhase("one_phase")
                    })()
                  }}
                >
                  Switch to single-phase
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPhaseModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      setPhaseModal(null)
                      await savePhase("two_phase")
                    })()
                  }}
                >
                  Use two-phase mode
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {goldOpen ? (
        <GoldDialog
          apiCtx={apiCtx}
          incidentType={goldOpen}
          onClose={() => setGoldOpen(null)}
          onSave={() => void load()}
        />
      ) : null}
    </div>
  )
}

function GoldDialog({
  apiCtx,
  incidentType,
  onClose,
  onSave,
}: {
  apiCtx: string
  incidentType: string
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cfName, setCfName] = useState("")
  const [cfType, setCfType] = useState("text")
  const [cfReq, setCfReq] = useState(true)
  const [custom, setCustom] = useState<GoldField[]>([])

  useEffect(() => {
    let a = true
    void (async () => {
      setLoading(true)
      const p = new URLSearchParams()
      p.set("incidentType", incidentType)
      const pre = (apiCtx || "?").replace(/^\?/, "")
      for (const s of pre.split("&").filter(Boolean)) {
        const [k, v] = s.split("=")
        if (k) p.set(k, v ? decodeURIComponent(v) : "")
      }
      const res = await fetch(`/api/admin/facility/gold-standards?${p.toString()}`)
      if (res.ok) {
        const j = (await res.json()) as { customFields: GoldField[] }
        if (a) setCustom(j.customFields ?? [])
      }
      if (a) setLoading(false)
    })()
    return () => {
      a = false
    }
  }, [apiCtx, incidentType])

  const defaults = getBuiltinGoldStandardItems(incidentType)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gold standards — {builtinIncidentTypeLabel(incidentType)}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-3">
            <p className="text-xs font-medium text-muted-foreground">Default (always required)</p>
            <ul className="mt-2 space-y-2">
              {defaults.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked disabled className="pointer-events-none" />
                  <span>{d.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium text-muted-foreground">Custom fields</p>
            {custom.map((c, i) => (
              <div key={c.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <Badge variant="secondary" className="mr-2 text-[10px]">
                    Custom
                  </Badge>
                  {c.name} ({c.type}
                  {c.required ? ", required" : ""})
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCustom((a) => a.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-9 w-40" value={cfName} onChange={(e) => setCfName(e.target.value)} />
              </div>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={cfType}
                onChange={(e) => setCfType(e.target.value)}
              >
                <option value="text">Text</option>
                <option value="yes_no">Yes / no</option>
                <option value="multi_select">Multi-select</option>
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={cfReq} onChange={(e) => setCfReq(e.target.checked)} /> Required
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!cfName.trim()) return
                  setCustom((a) => [
                    ...a,
                    { id: newId(), name: cfName.trim(), type: cfType, required: cfReq },
                  ])
                  setCfName("")
                }}
              >
                Add
              </Button>
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button
            onClick={async () => {
              setSaving(true)
              try {
                const res = await fetch(
                  "/api/admin/facility/gold-standards" + (apiCtx && apiCtx.length ? (apiCtx.startsWith("?") ? apiCtx : "?" + apiCtx) : ""),
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ incidentType, customFields: custom }),
                  },
                )
                if (!res.ok) {
                  toast.error("Save failed")
                  return
                }
                toast.success("Saved")
                onSave()
                onClose()
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
