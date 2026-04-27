"use client"

import { useCallback, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

function mergeQs(apiCtx: string, p: URLSearchParams) {
  const base = (apiCtx || "?").replace(/^\?/, "")
  for (const s of base.split("&").filter(Boolean)) {
    const [k, v] = s.split("=")
    if (k) p.set(k, v ? decodeURIComponent(v) : "")
  }
  return p.toString()
}

export default function AdminSettingsExportPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = getAdminContextQueryString(searchParams)
  const [days, setDays] = useState("90")
  const [includeNames, setIncludeNames] = useState(false)
  const [ackOpen, setAckOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const onToggleNames = useCallback(
    (on: boolean) => {
      if (on) {
        setAckOpen(true)
        return
      }
      setIncludeNames(false)
    },
    [setIncludeNames],
  )

  const download = (type: "incidents" | "assessments" | "residents") => {
    setExporting(true)
    const p = new URLSearchParams()
    p.set("type", type)
    p.set("includeNames", includeNames ? "true" : "false")
    if (type !== "residents") p.set("days", days)
    const qs = mergeQs(apiCtx, p)
    window.open(`/api/admin/export?${qs}`, "_blank")
    setTimeout(() => {
      setExporting(false)
      toast.success("Download started")
    }, 400)
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:py-8">
        <PageHeader title="Data export" description="Download CSVs for this facility. Resident names are optional and require acknowledgment." />
        <WaikCard>
          <WaikCardContent className="space-y-2 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Include resident names in exports</CardTitle>
                <CardDescription>Default off — only room numbers (HIPAA-safe default)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="in">On</Label>
                <Switch id="in" checked={includeNames} onCheckedChange={onToggleNames} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">When off, no residentName column in incident CSV, and room-only residents export.</p>
            <div className="space-y-1 max-w-32">
              <Label>Window (days)</Label>
              <Input value={days} onChange={(e) => setDays(e.target.value)} className="h-10" type="number" min={1} max={730} />
            </div>
          </WaikCardContent>
        </WaikCard>
        {[
          { type: "incidents" as const, title: "Incidents", desc: "Type, rooms, phase timestamps, reported by" },
          { type: "assessments" as const, title: "Assessments", desc: "Rooms, type, score, dates" },
          { type: "residents" as const, title: "Residents", desc: "Census (no date filter)" },
        ].map((b) => (
          <WaikCard key={b.type}>
            <WaikCardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{b.title}</CardTitle>
                <CardDescription className="mt-1">{b.desc}</CardDescription>
              </div>
              <Button
                type="button"
                className="min-h-12 gap-2"
                disabled={exporting}
                onClick={() => download(b.type)}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export {b.title}
              </Button>
            </WaikCardContent>
          </WaikCard>
        ))}

        <Dialog open={ackOpen} onOpenChange={setAckOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PHI in this export</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This export will contain Protected Health Information (PHI) including resident names. You are responsible
              for handling this file in compliance with HIPAA. Do you want to proceed?
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAckOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIncludeNames(true)
                  setAckOpen(false)
                }}
              >
                I understand — turn on
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
