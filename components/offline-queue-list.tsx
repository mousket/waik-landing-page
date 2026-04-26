"use client"

import { useEffect, useState } from "react"

import { getQueue, type QueuedIncident } from "@/lib/offline-queue"

export function OfflineQueueList() {
  const [items, setItems] = useState<QueuedIncident[] | null>(null)

  useEffect(() => {
    void getQueue()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Loading saved reports…</p>
  }
  if (items.length === 0) {
    return null
  }

  return (
    <div className="mt-6 rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm">
      <p className="mb-2 text-sm font-medium text-foreground">Reports waiting to upload</p>
      <ul className="space-y-2 text-sm text-foreground/90">
        {items.map((q) => (
          <li key={q.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-muted-foreground">Saved </span>
            {new Date(q.queuedAt).toLocaleString()}
            <br />
            <span className="text-xs text-muted-foreground">
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
