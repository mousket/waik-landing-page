"use client"

import type { ReactNode } from "react"

import { LoginWaveAnimation } from "@/components/login-wave-animation"
import { cn } from "@/lib/utils"

/**
 * Soft variant of the sign-in backdrop: grid, dot texture, primary wash,
 * and a low-opacity wave — keeps staff flows aligned with login + dashboard.
 */
export function StaffFlowBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-[#f7fbfc] to-background dark:via-background" />
      <div
        className="absolute inset-0 opacity-[0.11] sm:opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184 / 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] sm:opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(45 212 191 / 0.14) 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05]" />
      <div
        className="absolute bottom-0 left-0 right-0 w-full opacity-[0.38] motion-reduce:opacity-[0.14]"
        style={{ top: "clamp(38vh, 48vh, 58vh)" }}
      >
        <LoginWaveAnimation />
      </div>
    </div>
  )
}

export function StaffFlowFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <StaffFlowBackdrop />
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
