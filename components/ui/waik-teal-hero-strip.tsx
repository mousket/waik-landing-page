"use client"

import { LoginWaveAnimation } from "@/components/login-wave-animation"
import { cn } from "@/lib/utils"

/** Wave + grid strip aligned with sign-in / logged-in home modal (`ModalAuthHero`). */
export function WaikTealHeroStrip({
  className,
  heightClassName = "h-[132px]",
}: {
  className?: string
  /** Total strip height (default matches logged-in app entry modal). */
  heightClassName?: string
}) {
  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden border-b border-[#0D7377]/15 dark:border-[#0D7377]/25",
        heightClassName,
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#f0fafb] via-white to-[#e6f4f5] dark:from-[#0f1f20] dark:via-[#111827] dark:to-[#0c1919]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.16] sm:opacity-[0.2] dark:opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184 / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184 / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle, rgb(45 212 191 / 0.2) 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.09] via-transparent to-accent/[0.07]"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 top-[18%] opacity-[0.94] motion-reduce:opacity-70" aria-hidden>
        <LoginWaveAnimation />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/95 to-transparent dark:from-[#0f1f20]/95"
        aria-hidden
      />
    </div>
  )
}
