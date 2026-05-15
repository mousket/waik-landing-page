"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const TRENDS_CARD_SHELL = "rounded-2xl border border-border/50 bg-muted/20 px-4 py-4 text-sm"

export function TrendsCardNoFacility({ message = "Select a facility to load this module." }: { message?: string }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground"
      role="status"
    >
      {message}
    </div>
  )
}

export function TrendsCardError({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn(TRENDS_CARD_SHELL, className)} role="alert">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-3 h-9 rounded-xl" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function TrendsCardSkeleton({
  className,
  heightClass = "h-64",
}: {
  className?: string
  heightClass?: string
}) {
  return <Skeleton className={cn("w-full rounded-2xl", heightClass, className)} aria-busy="true" />
}

export function TrendsSnapshotLoadError({
  message,
  onRetry,
  retrying,
}: {
  message: string
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/25 px-4 py-3 text-sm shadow-sm" role="alert">
      <p className="font-medium text-foreground/90">Trends data unavailable</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-9 rounded-xl"
        disabled={retrying}
        onClick={onRetry}
      >
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  )
}
