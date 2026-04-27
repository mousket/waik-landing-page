"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { useDebouncedPhase2SectionSave } from "@/hooks/use-debounced-phase2-section-save"
import { getAdminContextQueryString, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { canAccessPhase2 } from "@/lib/waik-roles"
import { useWaikUser } from "@/hooks/use-waik-user"
import { sectionNameFromParam } from "@/lib/phase2-default-sections"
import type { Incident, IncidentPhase2Sections, Intervention } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

const FACTOR_OPTIONS = [
  "Medication change",
  "UTI or infection",
  "Environmental hazard",
  "Equipment failure",
  "Staffing issue",
  "Resident behavior",
  "Cognitive decline",
  "Pain or discomfort",
  "Toileting need",
  "Activity-related",
  "Other",
] as const

const DEPTS = [
  "nursing",
  "dietary",
  "therapy",
  "activities",
  "administration",
  "multiple",
] as const

function AutosaveHint({ state, lastSavedAt }: { state: string; lastSavedAt: Date | null }) {
  if (state === "saving") {
    return (
      <p className="text-xs text-muted-foreground">
        <Loader2 className="inline h-3 w-3 animate-spin" /> Saving…
      </p>
    )
  }
  if (state === "saved" && lastSavedAt) {
    return (
      <p className="text-xs text-muted-foreground" title={lastSavedAt.toISOString()}>
        Autosave · {format(lastSavedAt, "PPp")}
      </p>
    )
  }
  if (state === "error") {
    return <p className="text-xs text-destructive">Autosave failed. Use Save, then try again.</p>
  }
  if (state === "pending") {
    return <p className="text-xs text-muted-foreground">Unsaved — will auto-save 30s after the last change.</p>
  }
  return null
}

function paramFromKey(
  k: "contributingFactors" | "rootCause" | "interventionReview" | "newIntervention",
) {
  if (k === "contributingFactors") {
    return "contributing-factors"
  }
  if (k === "rootCause") {
    return "root-cause"
  }
  if (k === "interventionReview") {
    return "intervention-review"
  }
  return "new-intervention"
}

export default function AdminIncidentSectionPage() {
  const routeParams = useParams<{ id: string; sectionName: string }>()
  const incidentId = String(routeParams.id ?? "")
  const sectionParam = String(routeParams.sectionName ?? "")
  const sp = useAdminUrlSearchParams()
  const q = getAdminContextQueryString(sp)
  const { waikRole, isWaikSuperAdmin } = useWaikUser()
  const canP2 = isWaikSuperAdmin || canAccessPhase2(waikRole ?? "")

  const key = sectionNameFromParam(String(sectionParam ?? ""))
  const [incident, setIncident] = useState<Incident | null>(null)
  const [load, setLoad] = useState(true)
  const [saving, setSaving] = useState(false)

  const p2 = incident?.phase2Sections
  const refetch = useCallback(async () => {
    const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}${q}`, { credentials: "include" })
    if (!res.ok) {
      return
    }
    setIncident((await res.json()) as Incident)
  }, [incidentId, q])

  useEffect(() => {
    void refetch().finally(() => setLoad(false))
  }, [refetch])

  const patch = useCallback(
    async (body: Record<string, unknown>, silent: boolean) => {
      if (!key) {
        throw new Error("No section key")
      }
      const k = paramFromKey(key)
      if (!silent) {
        setSaving(true)
      }
      try {
        const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/sections/${k}${q}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string; id?: string }
        if (!res.ok) {
          const m = typeof j.error === "string" ? j.error : "Save failed"
          if (!silent) {
            toast.error(m)
          }
          throw new Error(m)
        }
        setIncident(j as Incident)
      } finally {
        if (!silent) {
          setSaving(false)
        }
      }
    },
    [incidentId, key, q],
  )

  if (load) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!key || !canP2 || !incident) {
    return <p className="p-6">Invalid section or no access</p>
  }
  if (incident.phase !== "phase_2_in_progress") {
    return (
      <p className="p-6 text-sm text-muted-foreground">Section editing is only open while Phase 2 is in progress.</p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Button asChild variant="ghost" className="w-fit">
        <Link href={buildAdminPathWithContext(`/admin/incidents/${incidentId}`, sp)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to investigation
        </Link>
      </Button>
      {key === "contributingFactors" && <Contributing s={p2?.contributingFactors} onPatch={patch} saving={saving} />}
      {key === "rootCause" && <RootCause s={p2?.rootCause} onPatch={patch} saving={saving} incidentId={incidentId} q={q} />}
      {key === "interventionReview" && (
        <InterventionReview
          s={p2?.interventionReview}
          onPatch={patch}
          saving={saving}
          residentId={incident.residentId}
          q={q}
        />
      )}
      {key === "newIntervention" && (
        <NewIntervention
          s={p2?.newIntervention}
          onPatch={patch}
          saving={saving}
          incidentId={incidentId}
          q={q}
          residentId={incident.residentId ?? null}
        />
      )}
    </div>
  )
}

function Contributing({
  s,
  onPatch,
  saving,
}: {
  s: IncidentPhase2Sections["contributingFactors"] | undefined
  onPatch: (b: Record<string, unknown>, silent: boolean) => Promise<void>
  saving: boolean
}) {
  const onSave = useCallback((b: Record<string, unknown>) => onPatch(b, true), [onPatch])
  const { schedule, saveNow, state, lastSavedAt } = useDebouncedPhase2SectionSave(onSave, { debounceMs: 30_000 })
  const [factors, setFactors] = useState<string[]>(s?.factors ?? [])
  const [notes, setNotes] = useState(s?.notes ?? "")
  const [other, setOther] = useState("")

  const sync = useCallback(() => {
    setFactors(s?.factors ?? [])
    setNotes(s?.notes ?? "")
  }, [s?.factors, s?.notes])

  useEffect(() => {
    sync()
  }, [sync])

  const buildFactors = useCallback(
    (nextFactors: string[] = factors, otherVal = other) => {
      return otherVal.trim() && nextFactors.includes("Other")
        ? [...nextFactors, `Other: ${otherVal.trim()}`]
        : nextFactors
    },
    [factors, other],
  )

  const buildPayload = useCallback(
    (status: "in_progress" | "complete") => {
      return { status, factors: buildFactors(), notes } as Record<string, unknown>
    },
    [buildFactors, notes],
  )

  const toggle = (f: string) => {
    const nextFactors = factors.includes(f) ? factors.filter((a) => a !== f) : [...factors, f]
    setFactors(nextFactors)
    schedule({ status: "in_progress", factors: buildFactors(nextFactors), notes })
  }

  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-lg font-semibold">Contributing factors</h1>
      <AutosaveHint state={state} lastSavedAt={lastSavedAt} />
      <div className="grid gap-2">
        {FACTOR_OPTIONS.map((f) => (
          <label key={f} className="flex items-center gap-2">
            <Checkbox
              checked={factors.includes(f)}
              onCheckedChange={() => {
                toggle(f)
              }}
            />
            {f}
          </label>
        ))}
        {factors.includes("Other") && (
          <div>
            <Label className="text-xs">Other (specify)</Label>
            <Input
              className="mt-1"
              value={other}
              onChange={(e) => {
                const v = e.target.value
                setOther(v)
                schedule({ status: "in_progress", factors: buildFactors(factors, v), notes })
              }}
            />
          </div>
        )}
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea
          className="mt-1 min-h-24"
          value={notes}
          onChange={(e) => {
            const v = e.target.value
            setNotes(v)
            schedule({ status: "in_progress", factors: buildFactors(), notes: v })
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={async () => {
            const b = buildPayload("in_progress")
            try {
              await saveNow(b)
              toast.success("Saved")
            } catch {
              toast.error("Save failed")
            }
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save now"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await onPatch(buildPayload("complete"), false)
              toast.success("Section marked complete")
            } catch {
              // toast in onPatch
            }
          }}
        >
          Mark complete
        </Button>
      </div>
    </div>
  )
}

function RootCause({
  s,
  onPatch,
  saving,
  incidentId,
  q,
}: {
  s: IncidentPhase2Sections["rootCause"] | undefined
  onPatch: (b: Record<string, unknown>, silent: boolean) => Promise<void>
  saving: boolean
  incidentId: string
  q: string
}) {
  const onSave = useCallback((b: Record<string, unknown>) => onPatch(b, true), [onPatch])
  const { schedule, saveNow, state, lastSavedAt } = useDebouncedPhase2SectionSave(onSave, { debounceMs: 30_000 })
  const [description, setDescription] = useState(s?.description ?? "")
  const [suggesting, setSuggesting] = useState(false)

  const sync = useCallback(() => {
    setDescription(s?.description ?? "")
  }, [s?.description])
  useEffect(() => {
    sync()
  }, [sync])

  return (
    <div className="space-y-2 text-sm">
      <h1 className="text-lg font-semibold">Root cause</h1>
      <AutosaveHint state={state} lastSavedAt={lastSavedAt} />
      <p className="text-xs text-muted-foreground">Narrative (min 50 characters to mark complete). Autosave 30s after edits.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={suggesting}
          onClick={async () => {
            setSuggesting(true)
            try {
              const res = await fetch(
                `/api/incidents/${encodeURIComponent(incidentId)}/suggest-root-cause${q}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "include" },
              )
              const j = (await res.json().catch(() => ({}))) as { error?: string; text?: string }
              if (!res.ok) {
                toast.error(typeof j.error === "string" ? j.error : "Suggestion failed")
                return
              }
              if (j.text) {
                setDescription(j.text)
                schedule({ status: "in_progress", description: j.text })
                toast.success("Insert suggested text. Edit before completing.")
              }
            } catch {
              toast.error("Request failed")
            } finally {
              setSuggesting(false)
            }
          }}
        >
          {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Suggest root cause (AI)
        </Button>
        <p className="text-[0.7rem] text-muted-foreground">When OpenAI is not configured, the button will show an error.</p>
      </div>
      <Textarea
        className="min-h-40"
        value={description}
        onChange={(e) => {
          const v = e.target.value
          setDescription(v)
          schedule({ status: "in_progress", description: v })
        }}
      />
      <p className="text-xs text-muted-foreground">Characters: {description.length}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={async () => {
            try {
              await saveNow({ status: "in_progress", description })
              toast.success("Saved")
            } catch {
              toast.error("Save failed")
            }
          }}
        >
          Save now
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await onPatch({ status: "complete", description } as any, false)
              toast.success("Root cause complete")
            } catch {
              return
            }
          }}
        >
          Mark complete
        </Button>
      </div>
    </div>
  )
}

type LocalRow = {
  localId: string
  serverId?: string
  description: string
  department: (typeof DEPTS)[number]
  type: "temporary" | "permanent"
  startDate: string
  notes: string
}

function toLocalRows(list: NonNullable<IncidentPhase2Sections["newIntervention"]>["interventions"] | undefined): LocalRow[] {
  if (!list?.length) {
    return [
      {
        localId: `n-${Date.now()}`,
        description: "",
        department: "nursing",
        type: "temporary",
        startDate: new Date().toISOString().slice(0, 10),
        notes: "",
      },
    ]
  }
  return list.map((r, i) => ({
    localId: `r-${i}-${(r as { description?: string }).description ?? "x"}`,
    serverId: undefined,
    description: (r as { description?: string }).description ?? "",
    department: (r.department as (typeof DEPTS)[number]) ?? "nursing",
    type: (r as { type?: "temporary" | "permanent" }).type === "permanent" ? "permanent" : "temporary",
    startDate:
      (r as { startDate?: string }).startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    notes: (r as { notes?: string }).notes ?? "",
  }))
}

function NewIntervention({
  s,
  onPatch,
  saving,
  incidentId,
  q,
  residentId: residentIdProp,
}: {
  s: IncidentPhase2Sections["newIntervention"] | undefined
  onPatch: (b: Record<string, unknown>, silent: boolean) => Promise<void>
  saving: boolean
  incidentId: string
  q: string
  residentId: string | null
}) {
  const onSave = useCallback((b: Record<string, unknown>) => onPatch(b, true), [onPatch])
  const { schedule, saveNow, state, lastSavedAt } = useDebouncedPhase2SectionSave(onSave, { debounceMs: 30_000 })
  const [rows, setRows] = useState<LocalRow[]>(() => toLocalRows(s?.interventions))
  const [posting, setPosting] = useState(false)
  const complete = s?.status === "complete"
  const resident = residentIdProp

  const toPayload = useCallback(
    (r: LocalRow) => ({
      description: r.description,
      department: r.department,
      type: r.type,
      startDate: r.startDate ? new Date(r.startDate).toISOString() : new Date().toISOString(),
      notes: r.notes || undefined,
    }),
    [],
  )

  const patchBodyFromRows = useCallback(
    (status: "in_progress" | "complete", list: LocalRow[]) => {
      return {
        status,
        interventions: list.map((r) => toPayload(r)),
      } as Record<string, unknown>
    },
    [toPayload],
  )

  const setRow = (id: string, p: Partial<LocalRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.localId === id ? { ...r, ...p } : r))
      schedule(patchBodyFromRows("in_progress", next))
      return next
    })
  }

  const addRow = () => {
    setRows((prev) => {
      const n: LocalRow = {
        localId: `n-${Date.now()}`,
        description: "",
        department: "nursing",
        type: "temporary",
        startDate: new Date().toISOString().slice(0, 10),
        notes: "",
      }
      const next = [...prev, n]
      schedule(patchBodyFromRows("in_progress", next))
      return next
    })
  }
  const removeRow = (id: string) => {
    if (rows.length < 2) {
      return
    }
    setRows((prev) => {
      const next = prev.filter((r) => r.localId !== id)
      schedule(patchBodyFromRows("in_progress", next))
      return next
    })
  }

  if (complete) {
    return (
      <div className="space-y-2 text-sm">
        <h1 className="text-lg font-semibold">New intervention</h1>
        <p className="text-muted-foreground">This section is complete. Unlock the investigation in admin to edit (when supported).</p>
        <ul className="list-disc pl-4 text-xs">
          {(s?.interventions ?? []).map((i, j) => (
            <li key={j}>
              <span className="font-medium">{(i as { description?: string }).description}</span> — {i.department} · {i.type}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-lg font-semibold">New intervention</h1>
      <AutosaveHint state={state} lastSavedAt={lastSavedAt} />
      <p className="text-xs text-muted-foreground">
        Drafts save to this incident. When you mark complete, each new intervention is created on the resident record
        and linked to this case.
      </p>
      {!resident ? (
        <p className="text-destructive">No resident linked; add a resident to the report before adding interventions.</p>
      ) : null}
      {rows.map((r) => (
        <div key={r.localId} className="space-y-2 rounded border p-3">
          <div className="flex justify-between">
            <span className="text-xs font-medium text-muted-foreground">Planned change</span>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(r.localId)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Textarea
            placeholder="Description (required to complete)"
            className="min-h-[72px]"
            value={r.description}
            onChange={(e) => {
              setRow(r.localId, { description: e.target.value })
            }}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Department</Label>
              <Select
                value={r.department}
                onValueChange={(v) => {
                  setRow(r.localId, { department: v as (typeof DEPTS)[number] })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={r.type}
                onValueChange={(v) => {
                  setRow(r.localId, { type: v as "temporary" | "permanent" })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={r.startDate.slice(0, 10)}
                onChange={(e) => {
                  setRow(r.localId, { startDate: e.target.value })
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                className="min-h-14"
                value={r.notes}
                onChange={(e) => {
                  setRow(r.localId, { notes: e.target.value })
                }}
              />
            </div>
          </div>
          {r.serverId && <p className="text-xs text-primary">On file: {r.serverId}</p>}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
        <Button
          type="button"
          disabled={saving || !resident}
          onClick={async () => {
            const b = patchBodyFromRows("in_progress", rows)
            try {
              await saveNow(b)
              toast.success("Saved")
            } catch {
              toast.error("Save failed")
            }
          }}
        >
          Save now
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!!posting || !resident}
          onClick={async () => {
            for (const row of rows) {
              if (!row.description.trim()) {
                toast.error("Every row must have a description before completing.")
                return
              }
            }
            setPosting(true)
            const errors: string[] = []
            const next = [...rows]
            try {
              for (let i = 0; i < next.length; i++) {
                if (next[i].serverId) {
                  continue
                }
                const p = toPayload(next[i])
                const res = await fetch(`/api/residents/${encodeURIComponent(String(resident))}/interventions${q}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    ...p,
                    triggeringIncidentId: incidentId,
                  }),
                })
                const j = (await res.json().catch(() => ({}))) as { error?: string; intervention?: { id?: string } }
                if (!res.ok) {
                  errors.push(`Row ${i + 1}: ${j.error ?? res.statusText}`)
                  continue
                }
                if (j.intervention?.id) {
                  next[i] = { ...next[i], serverId: j.intervention.id }
                }
              }
              if (errors.length) {
                setRows(next)
                setPosting(false)
                toast.error(`Some items failed: ${errors.join("; ")}. Fix and retry.`)
                return
              }
              setRows(next)
              await onPatch(
                { status: "complete", interventions: next.map((x) => toPayload(x)) } as any,
                false,
              )
              toast.success("Interventions added to the resident and section complete.")
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Complete failed")
            } finally {
              setPosting(false)
            }
          }}
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark complete & add to resident"}
        </Button>
      </div>
    </div>
  )
}

function InterventionReview({
  s,
  onPatch,
  saving,
  residentId,
  q,
}: {
  s: IncidentPhase2Sections["interventionReview"] | undefined
  onPatch: (b: Record<string, unknown>, silent: boolean) => Promise<void>
  saving: boolean
  residentId?: string
  q: string
}) {
  const onSave = useCallback((b: Record<string, unknown>) => onPatch(b, true), [onPatch])
  const { schedule, saveNow, state, lastSavedAt } = useDebouncedPhase2SectionSave(onSave, { debounceMs: 30_000 })
  const [list, setList] = useState<Intervention[]>([])
  const [iload, setIload] = useState(true)
  const [reviews, setReviews] = useState<Record<string, { stillEffective: boolean; notes: string }>>({})
  const complete = s?.status === "complete"

  useEffect(() => {
    if (!residentId) {
      setIload(false)
      return
    }
    void (async () => {
      const res = await fetch(`/api/residents/${encodeURIComponent(residentId)}/interventions${q}`, {
        credentials: "include",
      })
      if (!res.ok) {
        setIload(false)
        return
      }
      const j = (await res.json()) as { interventions?: unknown[] }
      setList((j.interventions ?? []) as Intervention[])
      setIload(false)
    })()
  }, [residentId, q, complete])

  useEffect(() => {
    if (!list.length) {
      setReviews({})
      return
    }
    const m: Record<string, { stillEffective: boolean; notes: string }> = {}
    for (const it of list) {
      const ex = s?.reviewedInterventions?.find((f) => f.interventionId === it.id)
      m[it.id] = {
        stillEffective: ex ? Boolean(ex.stillEffective) : true,
        notes: ex?.notes ?? "",
      }
    }
    setReviews(m)
  }, [list, s?.reviewedInterventions])

  const makeBody = (status: "in_progress" | "complete") => {
    const reviewedInterventions = list.map((i) => ({
      interventionId: i.id,
      stillEffective: reviews[i.id]?.stillEffective ?? true,
      notes: reviews[i.id]?.notes,
    }))
    return { status, reviewedInterventions }
  }

  if (!residentId) {
    return <p className="text-sm text-amber-800">Link a resident to this report to review interventions from their record.</p>
  }
  if (iload) {
    return <Loader2 className="h-6 w-6 animate-spin" />
  }

  if (complete) {
    return (
      <div className="space-y-2 text-sm">
        <h1 className="text-lg font-semibold">Intervention review</h1>
        <p className="text-muted-foreground">Section complete. Summary:</p>
        <ul className="list-disc pl-4 text-xs">
          {list.map((i) => {
            const r = s?.reviewedInterventions?.find((x) => x.interventionId === i.id)
            return (
              <li key={i.id}>
                {i.description} — {r?.stillEffective ? "Still effective" : "Not effective / remove"}{" "}
                {r?.notes ? `· ${r.notes}` : ""}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <h1 className="text-lg font-semibold">Intervention review</h1>
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium">No resident interventions on file</p>
          <p className="mt-1 text-muted-foreground">
            There are no interventions in this community&apos;s records for this resident. You can mark this section
            complete when there is nothing to review, or add interventions in the New intervention step first, then
            return here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={async () => {
              try {
                await onPatch(
                  { status: "in_progress", reviewedInterventions: [] } as any,
                  false,
                )
              } catch {
                return
              }
            }}
            variant="secondary"
            disabled={saving}
          >
            Save
          </Button>
          <Button
            type="button"
            onClick={async () => {
              try {
                await onPatch({ status: "complete", reviewedInterventions: [] } as any, false)
                toast.success("Intervention review complete (none on file).")
              } catch {
                return
              }
            }}
          >
            Mark complete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-lg font-semibold">Intervention review</h1>
      <AutosaveHint state={state} lastSavedAt={lastSavedAt} />
      <p className="text-xs text-muted-foreground">
        For each intervention, indicate whether the plan is still working. Autosave runs 30s after changes.
      </p>
      <ul className="space-y-3">
        {list.map((i) => (
          <li key={i.id} className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Placed {new Date(i.placedAt).toLocaleString()}</p>
            <p className="font-medium">{i.description}</p>
            <p className="text-xs">
              {i.department} · {i.type}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={reviews[i.id]?.stillEffective ?? true}
                onCheckedChange={() => {
                  setReviews((prev) => {
                    const cur = prev[i.id] ?? { stillEffective: true, notes: "" }
                    const n = {
                      ...prev,
                      [i.id]: { stillEffective: !cur.stillEffective, notes: cur.notes },
                    }
                    const reviewedInterventions = list.map((j) => ({
                      interventionId: j.id,
                      stillEffective: n[j.id]?.stillEffective ?? true,
                      notes: n[j.id]?.notes,
                    }))
                    schedule({ status: "in_progress", reviewedInterventions })
                    return n
                  })
                }}
              />
              Still effective (uncheck to mark for removal)
            </label>
            <div className="mt-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="mt-0.5 min-h-12 text-xs"
                value={reviews[i.id]?.notes ?? ""}
                onChange={(e) => {
                  const t = e.target.value
                  setReviews((prev) => {
                    const n = { ...prev, [i.id]: { stillEffective: prev[i.id]?.stillEffective ?? true, notes: t } }
                    const reviewedInterventions = list.map((j) => ({
                      interventionId: j.id,
                      stillEffective: n[j.id]?.stillEffective ?? true,
                      notes: n[j.id]?.notes,
                    }))
                    schedule({ status: "in_progress", reviewedInterventions })
                    return n
                  })
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={async () => {
            const b = makeBody("in_progress")
            try {
              await saveNow(b as any)
              toast.success("Saved")
            } catch {
              toast.error("Save failed")
            }
          }}
        >
          Save now
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            for (const i of list) {
              if (typeof reviews[i.id]?.stillEffective !== "boolean") {
                toast.error("Set still-effective for every intervention first.")
                return
              }
            }
            try {
              await onPatch(makeBody("complete") as any, false)
              toast.success("Intervention review complete")
            } catch {
              return
            }
          }}
        >
          Mark complete
        </Button>
      </div>
    </div>
  )
}
