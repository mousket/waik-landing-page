"use client"

import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shown inside Daily Command cards when the live incidents list failed to load,
 * so we never imply “all clear” from an empty `incidents` array.
 */
export function DailyCommandSnapshotUnavailable({
  message,
  className,
  minHeightClass = "min-h-[168px]",
}: {
  message: string
  className?: string
  /** Match sibling skeleton approximate height to limit layout shift. */
  minHeightClass?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/25 px-4 py-6 text-center sm:px-6",
        minHeightClass,
        className,
      )}
      role="status"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">Live snapshot paused</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{message}</p>
      <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
        Confirm the facility in the address bar matches your access, then use <span className="font-semibold">Retry</span>{" "}
        above.
      </p>
    </div>
  )
}
