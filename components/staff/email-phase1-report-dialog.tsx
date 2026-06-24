"use client"

import { useEffect, useState } from "react"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function EmailPhase1ReportDialog({
  incidentId,
  defaultEmail = "",
  open,
  onOpenChange,
}: {
  incidentId: string
  defaultEmail?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState(defaultEmail)
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail)
      setAttachPdf(true)
    }
  }, [open, defaultEmail])

  async function handleSend() {
    const to = email.trim()
    if (!to) {
      toast.error("Enter an email address")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/report/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, attachPdf }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (res.status === 503) {
        toast.error(data.error ?? "Email is not configured on this server")
        return
      }
      if (!res.ok) {
        toast.error(data.error ?? "Could not send email")
        return
      }

      toast.success(data.message ?? "Report email sent")
      onOpenChange(false)
    } catch {
      toast.error("Could not send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md rounded-2xl border border-primary/20 bg-gradient-to-b from-background to-muted/10",
        )}
      >
        <DialogHeader>
          <DialogTitle>Email signed report</DialogTitle>
          <DialogDescription>
            Send a copy of this Phase 1 clinical record to an email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="phase1-email-to">Email address</Label>
            <Input
              id="phase1-email-to"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <Checkbox checked={attachPdf} onCheckedChange={(v) => setAttachPdf(v === true)} />
            Attach PDF
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => void handleSend()} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EmailPhase1ReportButton({
  incidentId,
  defaultEmail = "",
  className,
}: {
  incidentId: string
  defaultEmail?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("rounded-xl", className)}
        onClick={() => setOpen(true)}
      >
        <Mail className="mr-1.5 h-4 w-4" />
        Email report
      </Button>
      <EmailPhase1ReportDialog
        incidentId={incidentId}
        defaultEmail={defaultEmail}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
