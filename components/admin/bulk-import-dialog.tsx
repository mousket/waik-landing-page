"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Loader2, Upload } from "lucide-react"

export type BulkImportPreviewRow = Record<string, unknown> & {
  error?: string
}

type PreviewColumn<T extends BulkImportPreviewRow> = {
  header: string
  cell: (row: T) => string
}

type ResultRow = { key: string; status: string; error?: string }

export type BulkImportDialogProps<T extends BulkImportPreviewRow> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  templateHeaders: string
  templateExampleRow: string
  templateFilename: string
  parseUrl: string
  confirmUrl: string
  columns: PreviewColumn<T>[]
  rowKey: (row: T, index: number) => string
  isImportable: (row: T) => boolean
  hasBlockingErrors: (rows: T[]) => boolean
  statusLabel: (row: T) => { text: string; className: string }
  confirmButtonLabel: (count: number) => string
  onComplete: () => void
  mapConfirmPayload: (rows: T[]) => unknown
  parseResultRows?: (json: unknown) => ResultRow[]
}

function defaultParseResults(json: unknown): ResultRow[] {
  const j = json as {
    results?: Array<{ email?: string; label?: string; status: string; error?: string }>
  }
  return (j.results ?? []).map((r) => ({
    key: r.email ?? r.label ?? "—",
    status: r.status,
    error: r.error,
  }))
}

export function BulkImportDialog<T extends BulkImportPreviewRow>({
  open,
  onOpenChange,
  title,
  description,
  templateHeaders,
  templateExampleRow,
  templateFilename,
  parseUrl,
  confirmUrl,
  columns,
  rowKey,
  isImportable,
  hasBlockingErrors,
  statusLabel,
  confirmButtonLabel,
  onComplete,
  mapConfirmPayload,
  parseResultRows = defaultParseResults,
}: BulkImportDialogProps<T>) {
  const [step, setStep] = useState(1)
  const [rows, setRows] = useState<T[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ResultRow[]>([])

  function reset() {
    setStep(1)
    setRows([])
    setProgress(0)
    setResults([])
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  function downloadTemplate() {
    const blob = new Blob([`${templateHeaders}\n${templateExampleRow}\n`], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = templateFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(file: File) {
    setBusy(true)
    setRows([])
    try {
      const fd = new FormData()
      fd.set("file", file)
      const res = await fetch(parseUrl, { method: "POST", body: fd, credentials: "include" })
      const j = (await res.json()) as { rows?: T[]; error?: string }
      if (!res.ok) {
        setRows([])
        return
      }
      setRows(j.rows ?? [])
      setStep(2)
    } finally {
      setBusy(false)
    }
  }

  const importable = rows.filter(isImportable)
  const blocking = hasBlockingErrors(rows)

  async function runConfirm() {
    setBusy(true)
    setStep(3)
    setProgress(0)
    setResults([])
    try {
      const res = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mapConfirmPayload(importable)),
      })
      const j = await res.json()
      setResults(parseResultRows(j))
      setProgress(100)
      onComplete()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{description}</div>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition hover:bg-muted/50">
              <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">Drop CSV or Excel here, or click to upload</span>
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                  e.target.value = ""
                }}
              />
            </label>
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing…
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{importable.length}</strong> ready to import,{" "}
              <span className="text-destructive">
                {rows.filter((r) => statusLabel(r).text === "Error").length}
              </span>{" "}
              errors,{" "}
              <span className="text-amber-600">
                {rows.filter((r) => {
                  const t = statusLabel(r).text
                  return t === "Exists" || t === "Duplicate" || t === "Warning"
                }).length}
              </span>{" "}
              skipped or flagged.
            </p>
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.header}>{c.header}</TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const st = statusLabel(r)
                    return (
                      <TableRow key={rowKey(r, i)}>
                        {columns.map((c) => (
                          <TableCell key={c.header} className="text-sm">
                            {c.cell(r)}
                          </TableCell>
                        ))}
                        <TableCell className={`text-sm ${st.className}`} title={r.error}>
                          {st.text}
                          {r.error ? ` — ${r.error}` : ""}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                disabled={blocking || importable.length === 0 || busy}
                onClick={() => void runConfirm()}
              >
                {confirmButtonLabel(importable.length)}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium">Results</p>
            <ul className="max-h-48 space-y-1 overflow-auto text-sm">
              {results.map((r, i) => (
                <li
                  key={`${r.key}-${i}`}
                  className={r.status === "failed" ? "text-destructive" : "text-green-600"}
                >
                  {r.key} — {r.status}
                  {r.error ? ` (${r.error})` : ""}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
