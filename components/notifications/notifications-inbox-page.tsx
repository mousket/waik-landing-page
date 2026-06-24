"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Archive } from "lucide-react"

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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const applyCategoryFilter = useCallback(
    (rows: NotificationRowDto[]) => {
      if (filter === "incident") return rows.filter((n) => n.category === "incident")
      if (filter === "investigation") return rows.filter((n) => n.category === "investigation")
      if (filter === "assessment") return rows.filter((n) => n.category === "assessment")
      if (filter === "system") return rows.filter((n) => n.category === "system" || n.category === "intelligence")
      return rows
    },
    [filter],
  )

  const load = useCallback(
    async (opts?: { append?: boolean; pageOverride?: number }) => {
      const nextPage = opts?.pageOverride ?? (opts?.append ? page + 1 : 1)
      setLoading(true)
      try {
        const base = filter === "unread" ? "limit=50&unreadOnly=true" : "limit=50"
        const r = await fetch(`/api/notifications?${base}&page=${nextPage}`, { credentials: "include" })
        const j = (await r.json()) as {
          notifications?: NotificationRowDto[]
          hasMore?: boolean
        }
        const rows = applyCategoryFilter(Array.isArray(j.notifications) ? j.notifications : [])

        if (opts?.append) {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            return [...prev, ...rows.filter((row) => !seen.has(row.id))]
          })
        } else {
          setItems(rows)
        }
        setPage(nextPage)
        setHasMore(Boolean(j.hasMore))
      } finally {
        setLoading(false)
      }
    },
    [filter, page, applyCategoryFilter],
  )

  useEffect(() => {
    void load({ pageOverride: 1 })
  }, [filter])

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

  const handleArchive = async (n: NotificationRowDto) => {
    await fetch(`/api/notifications/${encodeURIComponent(n.id)}/archive`, {
      method: "PATCH",
      credentials: "include",
    })
    setItems((prev) => prev.filter((row) => row.id !== n.id))
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
            void load({ pageOverride: 1 })
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
                <li key={n.id} className="group flex items-stretch">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="my-auto mr-2 h-9 w-9 shrink-0 rounded-xl text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100"
                    aria-label="Archive notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleArchive(n)
                    }}
                  >
                    <Archive className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && !loading ? (
            <div className="border-t border-border/50 p-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl"
                onClick={() => void load({ append: true })}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </WaikCardContent>
      </WaikCard>
    </div>
  )
}
