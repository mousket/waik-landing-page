import { CompletionRing } from "@/components/shared/completion-ring"
import { cn } from "@/lib/utils"

export function IncidentCompletionIndicator({
  percent,
  className,
  ringSize = 32,
  strokeWidth = 2.5,
  label,
}: {
  percent: number
  className?: string
  ringSize?: number
  strokeWidth?: number
  label?: string
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <CompletionRing percent={percent} size={ringSize} strokeWidth={strokeWidth} />
    </div>
  )
}
