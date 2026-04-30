"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Clock, KeyRound, Sparkles } from "lucide-react"

import type { WaikAppEntryResolution } from "@/lib/post-auth-destination"
import { Button } from "@/components/ui/button"
import { WaikTealHeroStrip } from "@/components/ui/waik-teal-hero-strip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const SESSION_DISMISS_KEY = "waik_home_app_entry_dismissed"

type PromptEntry = Exclude<WaikAppEntryResolution, { status: "anonymous" }>

function StatusGlyph({
  entry,
}: {
  entry: PromptEntry
}) {
  const wrap =
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D7377] to-[#0A3D40] text-white shadow-lg shadow-[#0D7377]/30 ring-2 ring-white/40 dark:ring-white/10 motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none"
  if (entry.status === "must_change_password") {
    return (
      <div className={wrap} aria-hidden>
        <KeyRound className="h-7 w-7 opacity-95" strokeWidth={1.75} />
      </div>
    )
  }
  if (entry.status === "pending_profile") {
    return (
      <div className={wrap} aria-hidden>
        <Clock className="h-7 w-7 opacity-95" strokeWidth={1.75} />
      </div>
    )
  }
  return (
    <div className={wrap} aria-hidden>
      <Sparkles className="h-7 w-7 opacity-95" strokeWidth={1.75} />
    </div>
  )
}

export function LoggedInAppAccessModal({
  entry,
  greetingName,
}: {
  entry: PromptEntry
  greetingName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return
    } catch {
      /* private mode / storage blocked */
    }
    setOpen(true)
  }, [])

  const dismissForSession = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1")
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  const goToApp = () => {
    router.push(entry.path)
    setOpen(false)
  }

  const primaryLabel =
    entry.status === "must_change_password"
      ? "Update password"
      : entry.status === "pending_profile"
        ? "View account status"
        : "Open WAiK application"

  const title =
    entry.status === "must_change_password"
      ? "Password update required"
      : entry.status === "pending_profile"
        ? "Account setup in progress"
        : "Welcome back to WAiK"

  const lead =
    greetingName && greetingName.trim().length > 0
      ? `${greetingName.trim()}, you are signed in.`
      : "You are signed in to WAiK."

  const bodyPrimary =
    entry.status === "must_change_password"
      ? "For your organization’s security, please create a new password before accessing the WAiK application. You will be guided through a short update, then returned to your workspace."
      : entry.status === "pending_profile"
        ? "Your WAiK profile is still being finalized. You may review your account status at any time. When provisioning is complete, you will have full access to the application."
        : `Would you like to enter the WAiK application now? You will be taken to the ${entry.workspaceLabel.toLowerCase()} that matches your role and permissions.`

  const bodySecondary =
    entry.status === "ready"
      ? entry.workspaceDescription
      : entry.status === "must_change_password"
        ? null
        : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismissForSession()
        else setOpen(next)
      }}
    >
      <DialogContent
        overlayClassName={cn(
          "fixed inset-0 z-50 bg-gradient-to-b from-[#0A3D40]/60 via-[#0A3D40]/45 to-[#0d7377]/35 backdrop-blur-[8px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:backdrop-blur-none motion-reduce:bg-black/75 motion-reduce:data-[state=open]:animate-none",
          "duration-300",
        )}
        className={cn(
          "gap-0 overflow-hidden rounded-2xl border-[#0D7377]/25 bg-background p-0 shadow-2xl shadow-[#0A3D40]/25 duration-300 dark:border-[#0D7377]/35 dark:shadow-black/40",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] motion-reduce:data-[state=open]:animate-none",
          "sm:max-w-[440px]",
        )}
      >
        <WaikTealHeroStrip />

        <div
          className={cn(
            "space-y-5 px-6 pb-6 pt-5",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:[animation-delay:120ms] motion-reduce:animate-none",
          )}
        >
          <div className="flex gap-4">
            <StatusGlyph entry={entry} />
            <DialogHeader className="flex-1 space-y-2 text-left">
              <DialogTitle className="text-xl font-semibold leading-snug tracking-tight text-[#0A3D40] dark:text-foreground">
                {title}
              </DialogTitle>
              <div className="h-px w-full max-w-[180px] bg-gradient-to-r from-[#0D7377] via-[#44DAD2]/80 to-transparent opacity-90" aria-hidden />
              <DialogDescription asChild>
                <div className="space-y-3 pt-1 text-left text-sm leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground/90">{lead}</p>
                  <p>{bodyPrimary}</p>
                  {bodySecondary ? <p className="text-muted-foreground/95">{bodySecondary}</p> : null}
                </div>
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter
            className={cn(
              "mt-1 flex-col gap-3 sm:flex-col sm:space-x-0",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:[animation-delay:240ms] motion-reduce:animate-none",
            )}
          >
            <Button
              type="button"
              className={cn(
                "group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0D7377] to-[#0b6569] text-base font-semibold text-white shadow-lg shadow-[#0D7377]/30",
                "ring-1 ring-[#0D7377]/30 transition-all hover:from-[#0f858a] hover:to-[#0D7377] hover:shadow-xl hover:shadow-[#0D7377]/35",
                "motion-safe:active:scale-[0.99] motion-safe:hover:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
              )}
              onClick={goToApp}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative inline-flex w-full items-center justify-center gap-2">
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-xl font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={dismissForSession}
            >
              Remain on this page
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
