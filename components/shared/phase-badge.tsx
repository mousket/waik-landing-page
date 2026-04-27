import { cn } from "@/lib/utils"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

export type PhaseBadgePhase = StaffIncidentSummary["phase"]

const phaseStyles: Record<PhaseBadgePhase, { className: string; label: string }> = {
  phase_1_in_progress: {
    className: "bg-[#FBF0D9] text-[#E8A838] border border-[#E8A838]/30",
    label: "Phase 1 Active",
  },
  phase_1_complete: {
    className: "bg-[#FEF9C3] text-[#A16207] border border-amber-300/50",
    label: "Phase 1 Complete",
  },
  phase_2_in_progress: {
    className: "bg-[#EFF6FF] text-[#2E86DE] border border-[#2E86DE]/25",
    label: "Phase 2 Active",
  },
  closed: {
    className: "bg-[#EEF8F8] text-[#0D7377] border border-[#0D7377]/25",
    label: "Closed",
  },
}

export function PhaseBadge({
  phase,
  size = "md",
  className,
}: {
  phase: PhaseBadgePhase
  size?: "sm" | "md"
  className?: string
}) {
  const s = phaseStyles[phase] ?? phaseStyles.closed
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  )
}
