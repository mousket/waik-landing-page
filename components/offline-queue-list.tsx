"use client"

import { useEffect, useState } from "react"

import { getQueue, type QueuedIncident } from "@/lib/offline-queue"
import { brand } from "@/lib/design-tokens"

export function OfflineQueueList() {
  const [items, setItems] = useState<QueuedIncident[] | null>(null)

  useEffect(() => {
    void getQueue()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items === null) {
    return <p className="text-sm text-white/80">Loading saved reports…</p>
  }
  if (items.length === 0) {
    return null
  }

  return (
    <div className="mt-6 rounded-lg border border-white/20 bg-black/20 p-4">
      <p className="mb-2 text-sm font-medium text-white">Reports waiting to upload</p>
      <ul className="space-y-2 text-sm text-white/90">
        {items.map((q) => (
          <li key={q.id} className="rounded border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/60">Saved </span>
            {new Date(q.queuedAt).toLocaleString()}
            <br />
            <span className="text-xs" style={{ color: brand.muted }}>
              {(() => {
                const p = q.payload as { title?: string; description?: string }
                return p.title ?? p.description ?? "Incident draft"
              })()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
