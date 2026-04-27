"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

const STORAGE: Record<"admin" | "staff", string> = {
  admin: "waik:hasSeenOnboarding:admin",
  staff: "waik:hasSeenOnboarding:staff",
}

const STEPS: Record<"admin" | "staff", { title: string; body: string }[]> = {
  admin: [
    {
      title: "Command center",
      body: "The dashboard summarizes what needs attention, active investigations, and recent closures for the facility in scope.",
    },
    {
      title: "Needs attention & investigations",
      body: "Use the tabs to triage new reports, work Phase 2, and review closed files — all in one place.",
    },
    {
      title: "Scope",
      body: "Switch the facility in the header when you cover more than one community, so data and links stay in sync.",
    },
    {
      title: "Settings",
      body: "From Settings you can adjust thresholds, notifications, exports, and the community profile — without a support call.",
    },
  ],
  staff: [
    {
      title: "Start here",
      body: "The dashboard is your shift snapshot: open questions, your recent work, and quick actions.",
    },
    {
      title: "Report an incident",
      body: "Use “Report incident” to capture what happened with guided questions. You can return anytime to finish.",
    },
    {
      title: "Pending questions",
      body: "This list shows reports that still need your input. Tap through until each one is done.",
    },
    {
      title: "Assessments & quality",
      body: "Upcoming care assessments and your performance trend help you stay ahead of the next need.",
    },
  ],
}

export function DashboardOnboarding({ role }: { role: "admin" | "staff" }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const key = STORAGE[role]
  const steps = STEPS[role]

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return
      setOpen(true)
      setStep(0)
    } catch {
      // localStorage may be unavailable; skip tour
    }
  }, [key])

  if (!open) return null

  const s = steps[step]
  if (!s) return null
  const last = step >= steps.length - 1

  function done() {
    try {
      localStorage.setItem(key, "1")
    } catch {
      // ignore
    }
    setOpen(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(100%,22rem)] px-3 sm:bottom-6 sm:right-6 sm:px-0">
      <WaikCard className="border-primary/20 shadow-2xl shadow-primary/10">
        <WaikCardContent className="space-y-3 p-4">
          <div className="text-xs font-semibold uppercase text-primary">
            {step + 1} of {steps.length}
          </div>
          <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{s.body}</CardDescription>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={done}
            >
              Skip
            </Button>
            {!last ? (
              <Button type="button" size="sm" className="h-9" onClick={() => setStep((i) => i + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" size="sm" className="h-9" onClick={done}>
                Got it
              </Button>
            )}
          </div>
        </WaikCardContent>
      </WaikCard>
    </div>
  )
}
