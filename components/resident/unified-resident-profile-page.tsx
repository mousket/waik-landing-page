"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ArrowLeft, AlertCircle, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ResidentIncidentsList,
  ResidentIncidentPillEvent,
  residentRecordPillClass,
  useResidentIncidentFilters,
  type ResidentIncidentRow,
} from "@/components/admin/resident-incidents-section"
import { ResidentNotesPanel, useResidentNoteFilters } from "@/components/admin/resident-notes-section"
import { OverviewCollapsibleSection } from "@/components/admin/overview-collapsible-section"

const DEPT = ["nursing", "dietary", "therapy", "activities", "administration", "multiple"] as const

type Detail = {
  resident: Record<string, unknown>
  incidents: ResidentIncidentRow[]
  assessments: Array<{
    id: string
    assessmentType: string
    status: string
    completenessScore: number
    conductedAt: string | null
    nextDueAt: string | null
    conductedByName: string
  }>
  interventions: Array<{
    id: string
    description: string
    department: string
    type: string
    isActive: boolean
    placedAt: string | null
    removedAt: string | null
    triggeringIncidentId?: string
  }>
  notes: Array<{
    id: string
    parentType: string
    parentId: string
    content: string
    authorName: string
    visibility: string
    isFlagged: boolean
    createdAt: string
  }>
}

function InterventionPillItem({
  i,
  onRemove,
  getIncidentPath,
}: {
  i: Detail["interventions"][number]
  onRemove: () => void
  getIncidentPath: (incidentId: string) => string
}) {
  return (
    <li
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-background/95 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4",
        "shadow-sm transition-all duration-200",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12 sm:rounded-xl">
          <ListChecks className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-0">
          <p className="line-clamp-3 text-sm font-semibold leading-snug text-foreground sm:text-base">
            {i.description}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
            <span className={cn(residentRecordPillClass(), "capitalize")}>
              {i.department}
            </span>
            <span className={cn(residentRecordPillClass(), "capitalize")}>
              {i.type}
            </span>
            {i.placedAt
              ? <span className={residentRecordPillClass()}>Placed {i.placedAt.slice(0, 10)}</span>
              : null}
            <span
              className={cn(
                residentRecordPillClass(),
                i.isActive ? "border-emerald-500/40 bg-emerald-500/10" : "opacity-80",
              )}
            >
              {i.isActive ? "Active" : "Removed"}
            </span>
            {i.isActive
              ? null
              : <span className={residentRecordPillClass()}>{`Removed ${i.removedAt?.slice(0, 10) ?? "—"}`}</span>}
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 sm:text-xs">
              Intervention
            </span>
          </div>
          {i.triggeringIncidentId
            ? (
                <div className="mt-2">
                  <Button variant="link" className="h-7 gap-0 px-0 text-xs" asChild>
                    <Link href={getIncidentPath(i.triggeringIncidentId)}>
                      See related incident
                    </Link>
                  </Button>
                </div>
              )
            : null}
          {i.isActive
            ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full min-h-9 sm:w-auto sm:max-w-xs"
                  onClick={onRemove}
                >
                  Remove
                </Button>
              )
            : null}
        </div>
      </div>
    </li>
  )
}

export function UnifiedResidentProfilePage({
  residentId,
  isAdminTier,
}: {
  residentId: string
  isAdminTier: boolean
}) {
  const searchParams = useAdminUrlSearchParams()
  const apiQ = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const getIncidentPath = useCallback(
    (incidentId: string) =>
      isAdminTier
        ? buildAdminPathWithContext(`/admin/incidents/${incidentId}`, searchParams)
        : `/staff/incidents/${encodeURIComponent(incidentId)}`,
    [isAdminTier, searchParams],
  )
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [mds, setMds] = useState<string | null>(null)
  const [mdsLoad, setMdsLoad] = useState(false)
  const [intOpen, setIntOpen] = useState(false)
  const [obsOpen, setObsOpen] = useState(false)
  const [iDesc, setIDesc] = useState("")
  const [iDept, setIDept] = useState<(typeof DEPT)[number]>("nursing")
  const [iType, setIType] = useState<"temporary" | "permanent">("permanent")
  const [iDate, setIDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [savingI, setSavingI] = useState(false)
  const [nContent, setNContent] = useState("")
  const [nVis, setNVis] = useState<"team" | "admin_only" | "sealed">("team")
  const [nFlag, setNFlag] = useState(false)
  const [savingN, setSavingN] = useState(false)

  const backHref = useMemo(
    () =>
      isAdminTier
        ? buildAdminPathWithContext("/admin/residents", searchParams)
        : "/staff/residents",
    [isAdminTier, searchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/residents/${encodeURIComponent(residentId)}${apiQ}`, { credentials: "include" })
      if (!r.ok) {
        setDetail(null)
        return
      }
      setDetail((await r.json()) as Detail)
    } finally {
      setLoading(false)
    }
  }, [apiQ, residentId])

  useEffect(() => {
    void load()
  }, [load])

  const loadMds = useCallback(async () => {
    if (mds != null || mdsLoad) {
      return
    }
    setMdsLoad(true)
    try {
      const r = await fetch(`/api/residents/${encodeURIComponent(residentId)}/mds-recommendations${apiQ}`, {
        credentials: "include",
      })
      const j = (await r.json()) as { recommendations?: string; error?: string }
      if (!r.ok) {
        setMds(j.error ?? "Could not load MDS")
      } else {
        setMds(j.recommendations ?? "")
      }
    } catch {
      setMds("Could not load MDS")
    } finally {
      setMdsLoad(false)
    }
  }, [apiQ, mds, mdsLoad, residentId])

  useEffect(() => {
    if (isAdminTier) {
      void loadMds()
    }
  }, [isAdminTier, loadMds])

  const incidentFilters = useResidentIncidentFilters(detail?.incidents ?? [])
  const noteFilters = useResidentNoteFilters(detail?.notes ?? [])

  const resident = detail?.resident
  const name = useMemo(() => {
    if (!resident) {
      return ""
    }
    return `${String(resident.firstName ?? "")} ${String(resident.lastName ?? "")}`.trim()
  }, [resident])
  const pref = resident && resident.preferredName != null && String(resident.preferredName).trim() !== "" ? ` (${String(resident.preferredName)})` : ""

  const flagged = useMemo(
    () => (detail?.notes?.filter((n) => n.isFlagged) ?? []),
    [detail],
  )

  async function submitInt(e: React.FormEvent) {
    e.preventDefault()
    setSavingI(true)
    try {
      const r = await fetch(`/api/residents/${encodeURIComponent(residentId)}/interventions${apiQ}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: iDesc, department: iDept, type: iType, startDate: iDate }),
        credentials: "include",
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        toast.error(j.error ?? "Save failed")
        return
      }
      toast.success("Intervention added")
      setIDesc("")
      setIntOpen(false)
      void load()
    } finally {
      setSavingI(false)
    }
  }

  async function removeInt(iid: string) {
    if (!window.confirm("Remove this intervention?")) {
      return
    }
    const r = await fetch(
      `/api/residents/${encodeURIComponent(residentId)}/interventions/${encodeURIComponent(iid)}${apiQ}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
        credentials: "include",
      },
    )
    if (r.ok) {
      void load()
    } else {
      toast.error("Update failed")
    }
  }

  async function submitObs(e: React.FormEvent) {
    e.preventDefault()
    setSavingN(true)
    try {
      const r = await fetch(`/api/residents/${encodeURIComponent(residentId)}/notes${apiQ}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: nContent,
          visibility: isAdminTier ? nVis : "team",
          isFlagged: nFlag,
        }),
        credentials: "include",
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        toast.error(j.error ?? "Could not save")
        return
      }
      setNContent("")
      setNFlag(false)
      setNVis("team")
      setObsOpen(false)
      void load()
      toast.success("Note saved")
    } finally {
      setSavingN(false)
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!detail || !resident) {
    return <div className="p-6 text-sm text-destructive">Resident not found or access denied.</div>
  }

  return (
    <div className="relative w-full">
        <div className="absolute inset-0 -z-10 min-h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="relative mx-auto w-full min-w-0 max-w-4xl px-4 py-6 pb-24 sm:pb-28">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" asChild className="w-fit">
            <Link href={backHref} className="text-muted-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <PageHeader
          title={name + pref}
          description={[
            "Room " + (String(resident.roomNumber) || "—"),
            (resident.careLevel as string) ? `• ${String(resident.careLevel).replace(/_/g, " ")}` : null,
            resident.status ? `• ${String(resident.status)}` : null,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {resident.admissionDate
            ? (
                <Badge variant="outline" className="text-xs">
                  Admitted: {String(resident.admissionDate).slice(0, 10)}
                </Badge>
              )
            : null}
        </div>

        <Tabs defaultValue="overview" className="w-full gap-2.5 sm:gap-3">
          <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
            <TabsTrigger
              value="overview"
              className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="incidents"
              className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
            >
              Incidents
            </TabsTrigger>
            <TabsTrigger
              value="assessments"
              className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
            >
              Assessments
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/20 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/8 data-[state=active]:to-primary/[0.04] data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"
            >
              Notes
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="overview"
            className="mt-4 min-h-0 space-y-4 overflow-x-hidden px-0.5 pb-6 pt-0 outline-none data-[state=inactive]:hidden"
          >
            {flagged.length > 0
              ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <p className="font-semibold text-destructive">
                      <AlertCircle className="mb-0.5 mr-1.5 inline h-4 w-4 align-text-bottom" />
                      Attention needed
                    </p>
                    <ul className="space-y-1 text-foreground/90">
                      {flagged.map((n) => (
                        <li key={n.id} className="whitespace-pre-wrap break-words">
                          {n.content} — {n.authorName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              : null}
            <OverviewCollapsibleSection
              className="border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-background shadow-sm"
              title={(
                <>
                  Care plan interventions
                  {detail.interventions.length > 0
                    ? (
                        <span className="ml-1.5 align-baseline text-sm font-semibold text-muted-foreground sm:text-base">
                          ({detail.interventions.length})
                        </span>
                      )
                    : null}
                </>
              )}
              right={(
                <Button type="button" className="min-h-9" size="sm" onClick={() => setIntOpen(true)}>
                  Add intervention
                </Button>
              )}
            >
              <ul className="list-none space-y-2.5" role="list">
                {detail.interventions.length === 0
                  ? (
                      <li className="text-sm text-muted-foreground">No interventions recorded yet.</li>
                    )
                  : (
                      detail.interventions.map((i) => (
                        <InterventionPillItem
                          key={i.id}
                          i={i}
                          getIncidentPath={getIncidentPath}
                          onRemove={() => {
                            void removeInt(i.id)
                          }}
                        />
                      ))
                    )}
              </ul>
            </OverviewCollapsibleSection>
            {isAdminTier ? (
              <OverviewCollapsibleSection
                defaultOpen={false}
                className="border border-accent/30 bg-gradient-to-br from-accent/[0.08] via-background to-background shadow-sm"
                title="MDS review suggestions"
              >
                {mdsLoad
                  ? (
                      <p className="text-sm text-muted-foreground">Analyzing clinical data…</p>
                    )
                  : (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                        {mds?.trim()
                          ? mds
                          : "No MDS review text yet. Open this section after clinical data is available."}
                      </p>
                    )}
              </OverviewCollapsibleSection>
            ) : null}
            <OverviewCollapsibleSection
              title={(
                <>
                  Recent incidents
                  <span className="ml-1.5 align-baseline text-sm font-medium text-muted-foreground sm:text-base">
                    (last
                    {` `}
                    {Math.min(3, detail.incidents.length)}
                    )
                  </span>
                </>
              )}
            >
              {detail.incidents.length === 0
                ? (
                    <p className="text-sm text-muted-foreground">No linked incidents yet.</p>
                  )
                : (
                    <ul className="list-none space-y-2.5" role="list">
                      {detail.incidents.slice(0, 3).map((x) => (
                        <ResidentIncidentPillEvent
                          key={x.id}
                          x={x}
                          searchParams={searchParams}
                          getIncidentHref={isAdminTier ? undefined : (id) => getIncidentPath(id)}
                        />
                      ))}
                    </ul>
                  )}
            </OverviewCollapsibleSection>
            <h3 className="text-sm font-medium text-foreground/80">Recent assessments (per type, last 2)</h3>
            {["activity", "dietary", "behavioral", "clinical"].map((t) => {
              const of = detail.assessments.filter((a) => a.assessmentType === t).slice(0, 2)
              if (of.length === 0) {
                return null
              }
              return (
                <div key={t} className="text-sm">
                  <p className="mb-1 capitalize font-medium">{t}</p>
                  <ul className="ml-1 space-y-1 text-muted-foreground">
                    {of.map((a) => (
                      <li key={a.id}>
                        {a.conductedAt?.slice(0, 10) ?? "—"} · {a.completenessScore}%
                        {a.nextDueAt
                          ? (
                              <>
                                {` · next due `}
                                {a.nextDueAt.slice(0, 10)}
                              </>
                            )
                          : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </TabsContent>
          <TabsContent
            value="incidents"
            className="mt-4 min-h-0 space-y-0 overflow-x-hidden px-0.5 pb-6 pt-0 outline-none data-[state=inactive]:hidden"
          >
            <ResidentIncidentsList
              incidents={detail.incidents}
              searchParams={searchParams}
              f={incidentFilters}
              getIncidentHref={isAdminTier ? undefined : (id) => getIncidentPath(id)}
            />
          </TabsContent>
          <TabsContent
            value="assessments"
            className="mt-4 min-h-0 space-y-2 overflow-x-hidden px-0.5 pb-6 pt-0 outline-none data-[state=inactive]:hidden"
          >
            {["activity", "dietary", "behavioral", "clinical"].map((g) => {
              const of = detail.assessments.filter((a) => a.assessmentType === g)
              if (of.length === 0) {
                return null
              }
              return (
                <div key={g} className="space-y-1">
                  <h3 className="text-sm font-semibold capitalize">{g.replace(/_/g, " ")}</h3>
                  {of.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-2 text-sm"
                    >
                      <span>
                        {a.conductedAt}
                        {` · `}
                        {a.completenessScore}%
                        {` — `}
                        {a.conductedByName}
                      </span>
                      {a.nextDueAt ? <span className="text-xs">Next: {a.nextDueAt}</span> : null}
                    </div>
                  ))}
                </div>
              )
            })}
            {detail.assessments.length === 0
              ? (
                  <p className="text-sm text-muted-foreground">No assessments for this resident.</p>
                )
              : null}
          </TabsContent>
          <TabsContent
            value="notes"
            className="mt-4 min-h-0 space-y-0 overflow-x-hidden px-0.5 pb-6 pt-0 outline-none data-[state=inactive]:hidden"
          >
            <ResidentNotesPanel
              notes={detail.notes}
              f={noteFilters}
              onAddObservation={() => {
                if (!isAdminTier) {
                  setNVis("team")
                }
                setObsOpen(true)
              }}
              showAdminNotesFilter={isAdminTier}
            />
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={intOpen} onOpenChange={setIntOpen}>
        <DialogContent>
          <form onSubmit={submitInt} className="space-y-3">
            <DialogHeader>
              <DialogTitle>Add intervention</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} required className="min-h-[80px]" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Select value={iDept} onValueChange={(v) => setIDept(v as (typeof DEPT)[number])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPT.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={iType}
                  onValueChange={(v) => {
                    if (v === "temporary" || v === "permanent") {
                      setIType(v)
                    }
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
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={iDate} onChange={(e) => setIDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIntOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingI}>
                {savingI ? "Saving…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={obsOpen} onOpenChange={setObsOpen}>
        <DialogContent className="gap-0 border-border/80 bg-gradient-to-b from-primary/[0.06] to-background sm:max-w-md sm:rounded-2xl">
          <form onSubmit={submitObs} className="space-y-4">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-lg">Add observation</DialogTitle>
              <DialogDescription>
                Saved to this resident&apos;s Notes. Set visibility and flag so the right people see it.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label className="text-foreground" htmlFor="obs-body">
                Observation
              </Label>
              <Textarea
                id="obs-body"
                value={nContent}
                onChange={(e) => setNContent(e.target.value)}
                className="mt-1.5 min-h-[100px] rounded-xl border-border/60"
                maxLength={2000}
                placeholder="What did you notice? Include date/time if relevant."
              />
            </div>
            <p className="text-xs text-right text-muted-foreground">
              {nContent.length}
              {"/2000"}
            </p>
            <div>
              <Label>Visibility</Label>
              {isAdminTier ? (
                <Select
                  value={nVis}
                  onValueChange={(v) => {
                    if (v === "team" || v === "admin_only" || v === "sealed") {
                      setNVis(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="admin_only">Admin only</SelectItem>
                    <SelectItem value="sealed">Sealed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Shared with the care team (team visibility)</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="f" checked={nFlag} onCheckedChange={(c) => setNFlag(c === true)} />
              <Label htmlFor="f">Flag for admin</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setObsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!nContent.trim() || savingN}>
                {savingN ? "Sending…" : "Save note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
