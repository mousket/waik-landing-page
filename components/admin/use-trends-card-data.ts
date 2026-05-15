"use client"

import { useTrendsSnapshot, useTrendsSnapshotLoading } from "@/components/admin/trends-snapshot-provider"
import type { TrendsSnapshotPayload } from "@/lib/types/trends-snapshot"

export function useTrendsCardData<T>(select: (snapshot: TrendsSnapshotPayload) => T) {
  const { snapshot, hasFacility } = useTrendsSnapshot()
  const loading = useTrendsSnapshotLoading()
  return {
    data: snapshot ? select(snapshot) : null,
    loading,
    hasFacility,
  }
}
