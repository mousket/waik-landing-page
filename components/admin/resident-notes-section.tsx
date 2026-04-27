"use client"

import { useMemo, useState } from "react"
import { Flag, LayoutGrid, Lock, MessageCircle, PenLine, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ResidentQuickFilterCard, residentRecordPillClass } from "@/components/admin/resident-incidents-section"

export type ResidentNoteRow = {
  id: string
  parentType: string
  parentId: string
  content: string
  authorName: string
  visibility: string
  isFlagged: boolean
  createdAt: string
}

export type NoteViewScope = "all" | "flagged" | "team" | "admin"

export function useResidentNoteFilters(notes: ResidentNoteRow[]) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [authorFilter, setAuthorFilter] = useState("all")
  const [viewScope, setViewScope] = useState<NoteViewScope>("all")

  const authorOptions = useMemo(() => {
    const s = new Set<string>()
    for (const n of notes) {
      const a = (n.authorName || "").trim()
      if (a) s.add(a)
    }
    return [...s].sort()
  }, [notes])

  const filtered = useMemo(() => {
    const fromT = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toT = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null

    return notes.filter((n) => {
      if (viewScope === "flagged" && !n.isFlagged) {
        return false
      }
      if (viewScope === "team" && n.visibility !== "team") {
        return false
      }
      if (viewScope === "admin" && n.visibility !== "admin_only" && n.visibility !== "sealed") {
        return false
      }
      const t = n.createdAt ? new Date(n.createdAt).getTime() : 0
      if (fromT != null && t < fromT) {
        return false
      }
      if (toT != null && t > toT) {
        return false
      }
      if (authorFilter !== "all" && (n.authorName || "") !== authorFilter) {
        return false
      }
      return true
    })
  }, [notes, dateFrom, dateTo, authorFilter, viewScope])

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    authorFilter,
    setAuthorFilter,
    viewScope,
    setViewScope,
    authorOptions,
    filtered,
  }
}

type F = ReturnType<typeof useResidentNoteFilters>

const NOTE_QUICK: {
  id: string
  scope: NoteViewScope
  label: string
  sub: string
  icon: typeof LayoutGrid
}[] = [
  { id: "all", scope: "all", label: "All notes", sub: "Every note in this view", icon: LayoutGrid },
  { id: "flag", scope: "flagged", label: "Flagged", sub: "Flagged for admin", icon: Flag },
  { id: "team", scope: "team", label: "Team", sub: "Visible to the care team", icon: MessageCircle },
  { id: "admin", scope: "admin", label: "Admin", sub: "Admin only or sealed", icon: Lock },
]

function formatVisibilityLabel(v: string) {
  return v === "sealed" ? "Sealed" : v === "admin_only" ? "Admin only" : v === "team" ? "Team" : v
}

function NoteRecordCard({ n }: { n: ResidentNoteRow }) {
  return (
    <li
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-background/95 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4",
        "shadow-sm transition-all duration-200",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12 sm:rounded-xl">
          <StickyNote className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-0">
          <p className="line-clamp-1 text-sm font-medium text-foreground/80">
            {n.parentType} · {n.parentId}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {n.content}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
            <span className={cn(residentRecordPillClass(), n.isFlagged && "border-destructive/40 bg-destructive/10")}>
              {n.isFlagged ? "Flagged" : "Not flagged"}
            </span>
            <span className={residentRecordPillClass()}>{formatVisibilityLabel(n.visibility)}</span>
            <span className={residentRecordPillClass()}>{(n.authorName || "—").trim() || "—"}</span>
            <span className={residentRecordPillClass()}>
              {n.createdAt ? n.createdAt.slice(0, 10) : "—"}
            </span>
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 sm:text-xs">
              Observation
            </span>
          </div>
        </div>
      </div>
    </li>
  )
}

export function ResidentNotesPanel({
  notes,
  f,
  onAddObservation,
  showAdminNotesFilter = true,
}: {
  notes: ResidentNoteRow[]
  f: F
  onAddObservation: () => void
  /** When false, hides the "Admin" scope filter (staff: All / Flagged / Team only). */
  showAdminNotesFilter?: boolean
}) {
  const rows = f.filtered
  const quickTiles = showAdminNotesFilter
    ? NOTE_QUICK
    : NOTE_QUICK.filter((q) => q.scope !== "admin")

  return (
    <div className="w-full space-y-4 pb-8">
      <div
        className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Observations & notes</p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Add a dated observation, then filter the list like incidents.
          </p>
        </div>
        <Button
          type="button"
          onClick={onAddObservation}
          className="h-10 w-full shrink-0 gap-2 sm:h-10 sm:w-auto sm:min-w-[10rem]"
        >
          <PenLine className="h-4 w-4" aria-hidden />
          Add observation
        </Button>
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[400px]:gap-4",
            quickTiles.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {quickTiles.map((q) => {
            const active = f.viewScope === q.scope
            return (
              <ResidentQuickFilterCard
                key={q.id}
                label={q.label}
                sub={q.sub}
                icon={q.icon}
                active={active}
                disabled={notes.length === 0}
                onSelect={() => {
                  if (notes.length === 0) return
                  f.setViewScope(q.scope)
                }}
              />
            )
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor="n-from">
              From date
            </Label>
            <Input
              id="n-from"
              type="date"
              value={f.dateFrom}
              onChange={(e) => f.setDateFrom(e.target.value)}
              className="min-h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor="n-to">
              To date
            </Label>
            <Input
              id="n-to"
              type="date"
              value={f.dateTo}
              onChange={(e) => f.setDateTo(e.target.value)}
              className="min-h-10"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs font-medium" htmlFor="n-author">
              Author
            </Label>
            <Select value={f.authorFilter} onValueChange={f.setAuthorFilter}>
              <SelectTrigger id="n-author" className="min-h-10 w-full">
                <SelectValue placeholder="All authors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authors</SelectItem>
                {f.authorOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {rows.length} of {notes.length} note{notes.length === 1 ? "" : "s"} in view
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          {notes.length === 0
            ? "No notes yet. Add an observation to start."
            : "No notes match the current filters."}
        </p>
      ) : (
        <ul className="space-y-2.5" role="list">
          {rows.map((n) => (
            <NoteRecordCard key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  )
}
