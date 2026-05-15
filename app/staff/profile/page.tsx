"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { PageHeader } from "@/components/ui/page-header"
import { cn } from "@/lib/utils"
import { ReportStepHeader } from "@/components/staff/report-step-header"

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function StaffProfilePage() {
  const [deviceType, setDeviceType] = useState<"personal" | "work">("personal")
  const [email, setEmail] = useState<string>("")
  const [loaded, setLoaded] = useState(false)
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined") return "default"
    if (!("Notification" in window)) return "unsupported"
    return Notification.permission
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/auth/user-flags", { credentials: "include" })
        const j = (await r.json()) as {
          deviceType?: string
          email?: string
        }
        if (cancelled) return
        if (j.deviceType === "work" || j.deviceType === "personal") {
          setDeviceType(j.deviceType)
        }
        if (typeof j.email === "string") setEmail(j.email)
      } catch {
        //
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveDeviceType = async (next: "personal" | "work") => {
    setDeviceType(next)
    try {
      const r = await fetch("/api/auth/device-type", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceType: next }),
      })
      if (!r.ok) throw new Error("Save failed")
      toast.success(next === "work" ? "Work device saved" : "Personal device saved")
    } catch {
      toast.error("Could not update device preference")
    }
  }

  const enablePush = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      toast.error("Push is not configured (missing NEXT_PUBLIC_VAPID_PUBLIC_KEY).")
      return
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push is not supported in this browser.")
      return
    }
    try {
      const p = await Notification.requestPermission()
      setPerm(p)
      if (p !== "granted") {
        toast.message("Notifications remain blocked until you enable them in browser settings.")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!r.ok) throw new Error()
      toast.success("Push notifications enabled.")
    } catch {
      toast.error("Could not subscribe to push from this browser.")
    }
  }

  const unsubscribePush = async () => {
    try {
      await fetch("/api/push/unsubscribe", { method: "DELETE", credentials: "include" })
      toast.success("This browser subscription was disabled.")
    } catch {
      toast.error("Could not unsubscribe.")
    }
  }

  const cardClass =
    "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04] shadow-md"

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 md:py-8">
      <div className="mx-auto flex w-full min-h-0 min-w-0 max-w-3xl flex-1 flex-col gap-8">
        <ReportStepHeader
          back={{ href: "/staff/dashboard", ariaLabel: "Back to dashboard" }}
          title="Profile & notifications"
          description="Tell WAiK whether this handset is yours or work-issued, and opt into browser push alerts."
        />

        {!loaded ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        <WaikCard className={cn("border-primary/25", cardClass)}>
          <WaikCardContent className="space-y-4 px-5 py-6 sm:px-7">
            <PageHeader title="Signed-in identity" description={email ? email : undefined} />

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                You are signed in with Clerk — name and password changes happen from the account bubble in the top
                right.
              </p>
            </div>
          </WaikCardContent>
        </WaikCard>

        <WaikCard className={cn("border-primary/25", cardClass)}>
          <WaikCardContent className="space-y-4 px-5 py-6 sm:px-7">
            <PageHeader
              title="Device classification"
              description="Personal phones get room-number-only wording in push payloads. Work devices may include fuller context when allowed by policy."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  deviceType === "personal"
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/25",
                )}
                onClick={() => void saveDeviceType("personal")}
              >
                <p className="text-sm font-semibold text-foreground">This is my personal device</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  PHI-minimized summaries (typically room identifiers only).
                </p>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  deviceType === "work"
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/25",
                )}
                onClick={() => void saveDeviceType("work")}
              >
                <p className="text-sm font-semibold text-foreground">This is a work-issued device</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Organization-managed handset — richer push copy when policy allows it.
                </p>
              </button>
            </div>
          </WaikCardContent>
        </WaikCard>

        <WaikCard className={cn("border-primary/25", cardClass)}>
          <WaikCardContent className="space-y-5 px-5 py-6 sm:px-7">
            <PageHeader
              title="Browser push alerts"
              description="Install WAiK to the home screen and enable alerts so Phase 2 nudges can reach off-session."
            />

            {perm === "denied" ? (
              <p className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                Push is blocked — open browser settings for this site and allow notifications for WAiK.
              </p>
            ) : null}

            {perm === "unsupported" ? (
              <p className="text-sm text-muted-foreground">
                Notifications API is unavailable in this environment (SSR or insecure context).
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {perm !== "granted" ? (
                <Button type="button" className="rounded-xl px-5" onClick={() => void enablePush()}>
                  Enable push notifications
                </Button>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-50">
                  Push notifications are enabled
                </span>
              )}
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => void unsubscribePush()}>
                Disable on this browser
              </Button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <Label className="text-[0.65rem] uppercase tracking-wider text-primary/75">Reminder</Label>
              <p>
                Web push requires HTTPS (or localhost) plus a configured VAPID public key in{" "}
                <span className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</span>.
              </p>
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
