"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ReportCompletionFeedback(props: { incidentId: string | null }) {
  const { incidentId } = props
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState("")

  if (!incidentId || !open) return null

  async function submit(rating: -1 | 0 | 1) {
    setBusy(true)
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          incidentId,
        }),
      })
      if (r.ok) {
        toast.success("Thank you for your feedback.")
        setOpen(false)
      } else {
        toast.error("Could not save feedback right now.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-left">
      <p className="text-sm font-semibold text-foreground">Was WAiK helpful today?</p>
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-14 flex-1 rounded-2xl text-2xl"
          disabled={busy}
          aria-label="Yes — helpful"
          onClick={() => void submit(1)}
        >
          👍
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-14 flex-1 rounded-2xl text-2xl"
          disabled={busy}
          aria-label="Sometimes"
          onClick={() => void submit(0)}
        >
          😐
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-14 flex-1 rounded-2xl text-2xl"
          disabled={busy}
          aria-label="Not really"
          onClick={() => void submit(-1)}
        >
          👎
        </Button>
      </div>
      <Label className="mt-4 block text-[0.65rem] uppercase tracking-wider text-primary/75">
        Tell us why (optional)
      </Label>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mt-1 rounded-xl bg-background"
        rows={3}
      />

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>
          Skip
        </Button>
      </div>
    </div>
  )
}
