"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "idle" | "loading" | "sent" | "error"

export function IdtSendReminderButton({
  targetUserId,
  incidentId,
  residentRoom,
  incidentTypeLabel,
}: {
  targetUserId: string
  incidentId: string
  residentRoom: string
  incidentTypeLabel: string
}) {
  const [status, setStatus] = useState<Status>("idle")
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReset = useCallback(() => {
    if (resetTimer.current != null) {
      clearTimeout(resetTimer.current)
      resetTimer.current = null
    }
  }, [])

  const send = useCallback(async () => {
    clearReset()
    setStatus("loading")
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetUserId,
          payload: {
            title: "Response needed — WAiK investigation",
            body: `Your input on the Room ${residentRoom} ${incidentTypeLabel} investigation is overdue.`,
            url: `/admin/incidents/${encodeURIComponent(incidentId)}`,
          },
        }),
      })
      if (!res.ok) {
        setStatus("error")
        return
      }
      setStatus("sent")
      resetTimer.current = setTimeout(() => {
        setStatus("idle")
        resetTimer.current = null
      }, 5000)
    } catch {
      setStatus("error")
    }
  }, [clearReset, incidentId, incidentTypeLabel, residentRoom, targetUserId])

  if (status === "sent") {
    return (
      <Button
        type="button"
        variant="outline"
        className="mt-3 min-h-[48px] border-2 border-emerald-600 font-semibold text-emerald-700"
        disabled
      >
        Sent ✓
      </Button>
    )
  }

  if (status === "error") {
    return (
      <Button
        type="button"
        variant="outline"
        className="mt-3 min-h-[48px] border-2 font-semibold border-red-600 text-red-700"
        onClick={() => void send()}
      >
        Failed — retry
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-3 min-h-[48px] border-2 border-primary font-semibold text-primary"
      disabled={status === "loading"}
      onClick={() => void send()}
    >
      {status === "loading" ? (
        <>
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        "Send Reminder"
      )}
    </Button>
  )
}
