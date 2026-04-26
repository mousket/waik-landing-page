import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] before:animate-shimmer",
        className,
      )}
      {...props}
    />
  )
}
