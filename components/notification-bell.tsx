"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type InboxNotification = {
  id: string
  message: string
  actorName?: string | null
  actionUrl?: string | null
  readAt?: string | null
  createdAt: string
  category?: string
}

function categoryTintClass(cat?: string | null): string {
  switch (cat) {
    case "incident":
      return "bg-primary"
    case "assessment":
      return "bg-sky-500"
    case "investigation":
      return "bg-amber-500"
    case "intelligence":
      return "bg-purple-500"
    case "system":
    default:
      return "bg-muted-foreground"
  }
}

async function patchRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    credentials: "include",
  })
}

async function patchReadAll(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "PATCH",
    credentials: "include",
  })
}

async function fetchCount(): Promise<number> {
  const r = await fetch("/api/notifications/count", { credentials: "include" })
  if (!r.ok) return 0
  const j = (await r.json()) as { unread?: number }
  return typeof j.unread === "number" ? j.unread : 0
}

async function fetchList(): Promise<InboxNotification[]> {
  const r = await fetch("/api/notifications?limit=10", { credentials: "include" })
  if (!r.ok) return []
  const j = (await r.json()) as { notifications?: InboxNotification[] }
  return Array.isArray(j.notifications) ? j.notifications : []
}

function navigateHref(router: ReturnType<typeof useRouter>, href: string): void {
  if (href.startsWith("http")) {
    window.location.href = href
    return
  }
  router.push(href.startsWith("/") ? href : `/${href}`)
}

export function NotificationBell(props: { historyHref: string; managePushHref: string }) {
  const { historyHref, managePushHref } = props
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InboxNotification[]>([])

  const refreshCount = useCallback(async () => {
    const next = await fetchCount()
    setUnread(next)
  }, [])

  useEffect(() => {
    void refreshCount()
    const id = window.setInterval(() => void refreshCount(), 60_000)
    return () => window.clearInterval(id)
  }, [refreshCount])

  const loadPanel = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchList()
      setItems(rows)
    } finally {
      setLoading(false)
    }
    void refreshCount()
  }, [refreshCount])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) void loadPanel()
  }

  const todayGroup = useMemo(() => items.filter((n) => isToday(new Date(n.createdAt))), [items])
  const yesterdayGroup = useMemo(
    () =>
      items.filter((n) => {
        const d = new Date(n.createdAt)
        return !isToday(d) && isYesterday(d)
      }),
    [items],
  )
  const olderGroup = useMemo(
    () =>
      items.filter((n) => {
        const d = new Date(n.createdAt)
        return !isToday(d) && !isYesterday(d)
      }),
    [items],
  )

  const unreadBadge = unread > 9 ? "9+" : unread > 0 ? String(Math.min(unread, 99)) : null

  const pick = async (n: InboxNotification) => {
    await patchRead(n.id)
    await refreshCount()
    navigateHref(router, n.actionUrl ?? historyHref)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center text-muted-foreground md:h-12 md:w-12"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={1.75} />
          {unreadBadge !== null ? (
            <span className="absolute right-1.5 top-1.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {unreadBadge}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end" sideOffset={10}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
            onClick={async () => {
              await patchReadAll()
              await loadPanel()
            }}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          <div className="divide-y divide-border/40 pb-14">
            {loading ? (
              <p className="px-4 py-6 text-xs text-muted-foreground">Loading…</p>
            ) : (
              <>
                {todayGroup.length > 0 ? (
                  <div className="px-2 py-2">
                    <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Today
                    </p>
                    {todayGroup.map((n) => (
                      <NotifRow key={n.id} n={n} onPick={() => void pick(n)} categoryTint={categoryTintClass(n.category)} />
                    ))}
                  </div>
                ) : null}
                {yesterdayGroup.length > 0 ? (
                  <div className="px-2 py-2">
                    <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Yesterday
                    </p>
                    {yesterdayGroup.map((n) => (
                      <NotifRow
                        key={n.id}
                        n={n}
                        onPick={() => void pick(n)}
                        categoryTint={categoryTintClass(n.category)}
                      />
                    ))}
                  </div>
                ) : null}
                {olderGroup.length > 0 ? (
                  <div className="px-2 py-2">
                    <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Older
                    </p>
                    {olderGroup.map((n) => (
                      <NotifRow
                        key={n.id}
                        n={n}
                        onPick={() => void pick(n)}
                        categoryTint={categoryTintClass(n.category)}
                      />
                    ))}
                  </div>
                ) : null}
                {!loading && items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur-md">
          <Button asChild variant="outline" size="sm" className="h-9 w-full rounded-xl text-xs font-semibold">
            <Link href={managePushHref} onClick={() => setOpen(false)}>
              Manage push notifications
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="h-9 w-full rounded-xl text-xs font-semibold">
            <Link href={historyHref} onClick={() => setOpen(false)}>
              View all
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotifRow(props: {
  n: InboxNotification
  onPick: () => void
  categoryTint: string
}) {
  const { n, onPick, categoryTint } = props
  const unreadDot = !n.readAt
  const when =
    typeof n.createdAt === "string"
      ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
      : ""

  return (
    <button
      type="button"
      className="flex w-full gap-2 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/80"
      onClick={() => void onPick()}
    >
      <span className="mt-1.5 inline-flex shrink-0">
        {unreadDot ? (
          <span className="block h-2 w-2 rounded-full bg-primary" aria-hidden />
        ) : (
          <span className="block h-2 w-2 rounded-full bg-transparent" aria-hidden />
        )}
      </span>
      <span className={cn("mt-[3px] h-8 w-8 shrink-0 rounded-full opacity-95", categoryTint)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-3 text-[13px] leading-snug text-foreground">{n.message}</span>
        {n.actorName ? (
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{n.actorName}</span>
        ) : null}
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{when}</span>
      </span>
    </button>
  )
}
