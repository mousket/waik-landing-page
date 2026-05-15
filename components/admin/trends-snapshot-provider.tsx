"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { TrendsSnapshotLoadError } from "@/components/admin/admin-trends-card-states"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { readApiErrorMessage } from "@/lib/read-api-error"
import type { TrendsRangeKey } from "@/lib/admin/trends-range"
import type { TrendsSnapshotPayload } from "@/lib/types/trends-snapshot"

type TrendsSnapshotContextValue = {
  snapshot: TrendsSnapshotPayload | null
  loading: boolean
  error: string | null
  retry: () => void
  hasFacility: boolean
  trendsRange: TrendsRangeKey
  searchParams: URLSearchParams
}

const TrendsSnapshotContext = createContext<TrendsSnapshotContextValue | null>(null)

export function TrendsSnapshotProvider({
  children,
  trendsRange,
  facilityId,
  searchParams,
}: {
  children: ReactNode
  trendsRange: TrendsRangeKey
  facilityId?: string
  searchParams: URLSearchParams
}) {
  const [snapshot, setSnapshot] = useState<TrendsSnapshotPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFacility = Boolean(facilityId?.trim())

  const load = useCallback(async () => {
    if (!hasFacility) {
      setSnapshot(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const ctx = getAdminContextQueryString(searchParams)
    const q = `range=${encodeURIComponent(trendsRange)}${ctx ? `&${ctx.slice(1)}` : ""}`
    try {
      const res = await fetch(`/api/admin/trends/snapshot?${q}`, { credentials: "include" })
      if (!res.ok) {
        const { message } = await readApiErrorMessage(res, "Could not load trends")
        throw new Error(message)
      }
      setSnapshot((await res.json()) as TrendsSnapshotPayload)
    } catch (e) {
      setSnapshot(null)
      setError(e instanceof Error ? e.message : "Could not load trends")
    } finally {
      setLoading(false)
    }
  }, [hasFacility, searchParams, trendsRange])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo(
    (): TrendsSnapshotContextValue => ({
      snapshot,
      loading,
      error,
      retry: () => void load(),
      hasFacility,
      trendsRange,
      searchParams,
    }),
    [snapshot, loading, error, load, hasFacility, trendsRange, searchParams],
  )

  return (
    <TrendsSnapshotContext.Provider value={value}>
      {error && !snapshot && hasFacility ? (
        <TrendsSnapshotLoadError message={error} onRetry={() => void load()} retrying={loading} />
      ) : null}
      {children}
    </TrendsSnapshotContext.Provider>
  )
}

export function useTrendsSnapshot(): TrendsSnapshotContextValue {
  const ctx = useContext(TrendsSnapshotContext)
  if (!ctx) {
    throw new Error("useTrendsSnapshot must be used within TrendsSnapshotProvider")
  }
  return ctx
}

/** True while the initial snapshot fetch is in flight (no cached payload yet). */
export function useTrendsSnapshotLoading(): boolean {
  const { loading, snapshot } = useTrendsSnapshot()
  return loading && !snapshot
}
