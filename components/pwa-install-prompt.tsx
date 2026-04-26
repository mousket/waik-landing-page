"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY = "waik-pwa-dismissed"

function isIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

export function PwaInstallPrompt() {
  const [dismissed, setDismissed] = useState(true)
  const [deferred, setDeferred] = useState<{
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: string }>
  } | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        return
      }
    } catch {
      return
    }
    if (isIos()) {
      setShowIosHint(true)
      setDismissed(false)
      return
    }
    setDismissed(false)

    const onBip = (e: Event) => {
      e.preventDefault()
      const p = e as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }
      if (typeof p.prompt === "function") {
        setDeferred({
          prompt: () => p.prompt!(),
          userChoice: p.userChoice ?? Promise.resolve({ outcome: "accepted" }),
        })
      }
    }
    window.addEventListener("beforeinstallprompt", onBip)
    return () => window.removeEventListener("beforeinstallprompt", onBip)
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }, [])

  const onAdd = useCallback(async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      /* user dismissed system UI */
    }
    dismiss()
  }, [deferred, dismiss])

  if (dismissed) {
    return null
  }

  if (showIosHint) {
    return (
      <div
        className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-[#0A3D40]/20 bg-white p-4 shadow-lg md:px-8"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        role="dialog"
        aria-label="Add to home screen"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#1a3d40]">
            <span className="font-medium text-[#0D7377]">Add WAiK to your home screen</span> — tap
            the Share button, then &quot;Add to Home Screen&quot; for the best full-screen
            experience.
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-[#0A3D40]/20 bg-white p-4 shadow-lg md:px-8"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label="Install WAiK"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 flex-1 text-sm text-[#1a3d40]">
          <span className="font-medium text-[#0D7377]">Add WAiK to your home screen</span> for the
          best experience.
          {!deferred
            ? " You can also use the browser menu (⋮) → “Install” or “Add to Home screen” if no button appears."
            : null}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {deferred ? (
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className="bg-[#0D7377] text-white hover:bg-[#0a5c5f]"
            >
              Add
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
