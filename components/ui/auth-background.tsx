"use client"

import type { ReactNode } from "react"

import { LoginWaveAnimation } from "@/components/login-wave-animation"
import { cn } from "@/lib/utils"

/**
 * Auth screen backdrop: former sign-in gradient plus canvas wave animation
 * (same palette as hero / login-wave-animation — turquoise, blue, purple).
 */
export function AuthBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#f0fafb] via-white to-[#e6f4f5]"
        aria-hidden
      />
      {/* Fine square grid — very soft (tech UI, not harsh) */}
      <div
        className="absolute inset-0 opacity-[0.16] sm:opacity-[0.2]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184 / 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184 / 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />
      {/* Dot texture — whisper-light */}
      <div
        className="absolute inset-0 opacity-[0.05] sm:opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle, rgb(45 212 191 / 0.18) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/[0.06]"
        aria-hidden
      />
      {/* Waves: fill from bottom upward; top edge ~40% higher than before (~mid 30–50% lift) */}
      <div
        className="absolute bottom-0 left-0 right-0 w-full opacity-[0.92]"
        style={{ top: "clamp(14vh, 18vh, 24vh)" }}
        aria-hidden
      >
        <LoginWaveAnimation />
      </div>
    </div>
  )
}

/** Full-bleed frame below the global header: wave + gradient with centered content. */
export function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="clerk-auth-scope relative flex min-h-[calc(100dvh-4rem)] w-full flex-col">
      <AuthBackground />
      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6">{children}</div>
    </div>
  )
}
