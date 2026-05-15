"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/ui/page-header"

export type NotificationRowDto = {
  id: string
  message: string
  actorName?: string | null
  actionUrl?: string | null
  readAt?: string | null
  createdAt: string
  category?: string | null
}

type FilterTab = "all" | "unread" | "incident" | "investigation" | "assessment" | "system"

function tint(cat?: string | null): string {
  switch (cat) {
    case "incident":
      return "bg-primary"
    case "investigation":
      return "bg-amber-500"
    case "assessment":
      return "bg-sky-500"
    case "intelligence":
      return "bg-purple-500"
    default:
      return "bg-muted-foreground"
  }
}

export function NotificationsInboxPage(props: {
  /** "Staff notifications" vs "Administrator notifications" */
  title: string
  subtitle?: string
  fallbackHref: string
}) {
  const { title, subtitle = "Unread items show a teal dot. Tap any row to open and mark read.", fallbackHref } = props
  const router = useRouter()
  const [filter, setFilter] = useState<FilterTab>("all")
  const [items, setItems] = useState<NotificationRowDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filter === "unread" ? "limit=50&unreadOnly=true" : "limit=50"

      const r = await fetch(`/api/notifications?${qs}`, { credentials: "include" })
      const j = (await r.json()) as { notifications?: NotificationRowDto[] }
      const rows = Array.isArray(j.notifications) ? j.notifications : []

      let next = rows
      if (filter === "incident") next = rows.filter((n) => n.category === "incident")
      if (filter === "investigation") next = rows.filter((n) => n.category === "investigation")
      if (filter === "assessment") next = rows.filter((n) => n.category === "assessment")
      if (filter === "system") next = rows.filter((n) => n.category === "system" || n.category === "intelligence")

      setItems(next)
    } finally {
      setLoading(false)
    }
  }, [filter, fallbackHref])

  useEffect(() => {
    void load()
  }, [load])

  const tabs = useMemo(
    () =>
      [
        { id: "all" as const, label: "All" },
        { id: "unread" as const, label: "Unread" },
        { id: "incident" as const, label: "Incidents" },
        { id: "investigation" as const, label: "Investigations" },
        { id: "assessment" as const, label: "Assessments" },
        { id: "system" as const, label: "System" },
      ] as const,
    [],
  )

  const handleRow = async (n: NotificationRowDto) => {
    await fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`, {
      method: "PATCH",
      credentials: "include",
    })

    const href = n.actionUrl ?? fallbackHref
    if (href.startsWith("http")) {
      window.location.href = href
      return
    }
    router.push(href.startsWith("/") ? href : `/${href}`)
  }

  return (
    <div className="mx-auto flex min-h-0 min-w-0 max-w-3xl flex-1 flex-col gap-6 px-3 py-4 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={title} description={subtitle} />
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={async () => {
            await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" })
            void load()
          }}
        >
          Mark all read
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={filter === t.id ? "default" : "outline"}
            className="h-9 rounded-full px-4 text-xs font-semibold"
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <WaikCard className="min-h-0 border-border/50">
        <WaikCardContent className="min-h-0 space-y-0 p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nothing to show yet. When incidents move through Phase 1 and Phase 2, items land here automatically.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60"
                    onClick={() => void handleRow(n)}
                  >
                    <span className="mt-2 inline-flex shrink-0">
                      {n.readAt ? (
                        <span className="h-2 w-2 rounded-full bg-transparent" aria-hidden />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                      )}
                    </span>
                    <span className={cn("mt-1.5 h-9 w-9 shrink-0 rounded-full", tint(n.category))} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{n.message}</span>
                      {n.actorName ? (
                        <span className="mt-1 block text-xs text-muted-foreground">{n.actorName}</span>
                      ) : null}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </WaikCardContent>
      </WaikCard>
    </div>
  )
}
