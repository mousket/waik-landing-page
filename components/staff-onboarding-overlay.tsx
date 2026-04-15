"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const STEPS = [
  "Welcome to WAiK. This is your dashboard.",
  "Tap Report Incident to start a voice report.",
  "Pending questions appear here when WAiK needs more detail.",
  "You are ready to go.",
] as const

export function StaffOnboardingOverlay({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!userId || typeof window === "undefined") return
    const key = `waik-onboarding-complete-${userId}`
    if (!localStorage.getItem(key)) {
      setOpen(true)
    }
  }, [userId])

  if (!open || !userId) return null

  function finish() {
    const key = `waik-onboarding-complete-${userId}`
    localStorage.setItem(key, "1")
    setOpen(false)
  }

  function next() {
    if (step >= STEPS.length - 1) {
      finish()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="max-w-md w-full shadow-2xl border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">
            Step {step + 1} of {STEPS.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{STEPS[step]}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={finish}>
            Skip
          </Button>
          <Button size="sm" onClick={next}>
            {step >= STEPS.length - 1 ? "Done" : "Next"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
