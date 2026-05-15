"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Single calm notice for Daily Command when incidents and/or stats fail —
 * avoids a column of red alert boxes (task 5c1-11).
 */
export function AdminDashboardLiveDataNotice({
  incidentsError,
  statsError,
  effectiveFacilityId,
  onRetry,
  retrying,
}: {
  incidentsError: string | null
  statsError: string | null
  effectiveFacilityId?: string
  onRetry: () => void
  retrying?: boolean
}) {
  if (!incidentsError && !statsError) return null

  const primary = incidentsError ?? statsError
  const secondary = incidentsError && statsError && statsError !== incidentsError ? statsError : null

  return (
    <div
      className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/35 to-muted/10 px-4 py-3.5 shadow-sm sm:px-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">Some live data did not load</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{primary}</p>
          {secondary ? <p className="text-xs leading-relaxed text-muted-foreground">{secondary}</p> : null}
          {effectiveFacilityId ? (
            <p className="text-[11px] text-muted-foreground">
              Facility scope: <span className="font-mono text-foreground/80">{effectiveFacilityId}</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Select a facility if the list stays empty after retry.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={retrying}
          className="h-9 shrink-0 self-start rounded-xl border-border/60 font-semibold sm:self-center"
          onClick={onRetry}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", retrying && "animate-spin")} aria-hidden />
          Retry
        </Button>
      </div>
    </div>
  )
}
