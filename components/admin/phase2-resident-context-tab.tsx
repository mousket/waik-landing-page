"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { incidentPatternFromRows, type ResidentIncidentRow } from "@/lib/resident-incident-pattern"
import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { ExternalLink, Loader2, AlertTriangle } from "lucide-react"

type ResidentApiResponse = {
  resident?: { firstName?: string; lastName?: string; roomNumber?: string; id?: string }
  incidents: Array<{
    id: string
    incidentType: string
    startedAt: string
  }>
  assessments: Array<{
    id: string
    assessmentType: string
    status: string
    completenessScore: number
    conductedAt: string | null
    nextDueAt?: string | null
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
    notes?: string
  }>
  error?: string
}

type Props = {
  residentId: string
  residentName: string
  incidentId: string
  searchParams: URLSearchParams
}

export function Phase2ResidentContextTab({ residentId, residentName, incidentId, searchParams }: Props) {
  const apiQ = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [data, setData] = useState<ResidentApiResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/residents/${encodeURIComponent(residentId)}${apiQ}`, {
        credentials: "include",
      })
      const j = (await res.json().catch(() => ({}))) as ResidentApiResponse & { error?: string }
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Could not load resident data.")
        setData(null)
        return
      }
      setData({
        resident: j.resident as ResidentApiResponse["resident"],
        incidents: Array.isArray(j.incidents) ? j.incidents : [],
        assessments: Array.isArray(j.assessments) ? j.assessments : [],
        interventions: Array.isArray(j.interventions) ? j.interventions : [],
      })
    } catch {
      setErr("Network error")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [apiQ, residentId])

  useEffect(() => {
    void load()
  }, [load])

  const pattern = useMemo(() => {
    if (!data?.incidents) {
      return null
    }
    const rows: ResidentIncidentRow[] = data.incidents.map((i) => ({
      id: i.id,
      incidentType: i.incidentType,
      startedAt: i.startedAt,
    }))
    return incidentPatternFromRows(rows)
  }, [data?.incidents])

  const displayName = [data?.resident?.firstName, data?.resident?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || residentName
  const room = data?.resident?.roomNumber ?? "—"

  const assessmentsPreview = useMemo(() => {
    if (!data?.assessments?.length) {
      return []
    }
    const want = (t: string) => data.assessments.filter((a) => a.assessmentType === t)
    return [...want("dietary"), ...want("activity")].sort((a, b) => {
      const ta = a.conductedAt ? new Date(a.conductedAt).getTime() : 0
      const tb = b.conductedAt ? new Date(b.conductedAt).getTime() : 0
      return tb - ta
    }).slice(0, 4)
  }, [data?.assessments])

  if (loading) {
    return (
      <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading resident context…
      </div>
    )
  }
  if (err) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {err}
        <Button type="button" variant="link" className="ml-2 p-0 h-auto" onClick={() => void load()}>
          Retry
        </Button>
      </p>
    )
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">No data</p>
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium">
          {displayName}
          <span className="ml-1 text-muted-foreground">· Room {room}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link
              href={buildAdminPathWithContext(`/residents/${encodeURIComponent(residentId)}`, searchParams)}
            >
              Open resident
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link href={buildAdminPathWithContext("/admin/assessments", searchParams)}>All assessments</Link>
          </Button>
        </div>
      </div>

      {pattern && pattern.alertRepeat30 && (
        <div
          className="flex items-start gap-2 rounded border border-amber-300/80 bg-amber-50/90 p-2 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Repeat incident pattern (30 days)</p>
            <p className="text-xs opacity-90">
              {pattern.count30} or more report(s) in the last 30 days for this resident (including all phases).
              Review trends and follow-up in the main resident record.
            </p>
          </div>
        </div>
      )}

      <WaikCard>
        <WaikCardContent className="space-y-1 py-3">
          <p className="text-xs font-medium text-muted-foreground">Incident pattern (this facility)</p>
          <p className="text-xs text-muted-foreground">
            Counts use report start time (Phase 1 start, else created). All phases included.
          </p>
          {pattern && (
            <ul className="mt-1 grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
              <li>
                <span className="block text-lg font-semibold">{pattern.count30}</span>
                <span className="text-[0.65rem] text-muted-foreground">30d</span>
              </li>
              <li>
                <span className="block text-lg font-semibold">{pattern.count90}</span>
                <span className="text-[0.65rem] text-muted-foreground">90d</span>
              </li>
              <li>
                <span className="block text-lg font-semibold">{pattern.count180}</span>
                <span className="text-[0.65rem] text-muted-foreground">180d</span>
              </li>
            </ul>
          )}
          {pattern && Object.keys(pattern.byType30).length > 0 && (
            <div className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">30d by type: </span>
              {Object.entries(pattern.byType30)
                .map(([k, v]) => `${k} (${v})`)
                .join(" · ")}
            </div>
          )}
        </WaikCardContent>
      </WaikCard>

      <div>
        <p className="mb-1.5 text-xs font-medium">Intervention history</p>
        {data.interventions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No interventions on file.</p>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
            {data.interventions.map((i) => (
              <li
                key={i.id}
                className={`rounded border p-2 ${!i.isActive || i.removedAt ? "opacity-70" : ""}`}
              >
                <p className={!i.isActive || i.removedAt ? "line-through" : ""}>
                  {i.description}
                </p>
                <p className="text-muted-foreground">
                  {i.department} · {i.type}
                  {i.placedAt && ` · ${new Date(i.placedAt).toLocaleDateString()}`}
                  {i.removedAt && " · removed"}
                </p>
                {i.notes && <p className="mt-0.5 text-muted-foreground/90">{i.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium">Recent assessments (dietary / activity)</p>
        {assessmentsPreview.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            None on file, or not yet in this community’s assessment list. Use Assessments in admin for full list.
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {assessmentsPreview.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-1 rounded border p-2">
                <span className="font-medium capitalize">{a.assessmentType}</span>
                <span className="text-muted-foreground">
                  {a.completenessScore != null && `${a.completenessScore}%`} · {a.status}
                </span>
                <span className="w-full text-[0.7rem] text-muted-foreground">
                  {a.conductedAt
                    ? new Date(a.conductedAt).toLocaleString()
                    : "—"}{" "}
                  {a.conductedByName ? `· ${a.conductedByName}` : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[0.7rem] text-muted-foreground">
        Current investigation <span className="font-mono">#{incidentId.slice(0, 8)}…</span> is included in counts
        when in the time window. Compare with the resident’s full timeline for trends.
      </p>
    </div>
  )
}
