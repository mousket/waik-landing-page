"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Search } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Resident = {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  careLevel: string
  status?: string
}

function formatCare(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StaffResidentsSearchClient() {
  const [q, setQ] = useState("")
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)

  const runSearch = useCallback(async () => {
    setLoading(true)
    try {
      const u = new URLSearchParams()
      if (q.trim()) u.set("search", q.trim())
      const url = u.toString() ? `/api/residents?${u.toString()}` : "/api/residents"
      const r = await fetch(url, { credentials: "include" })
      if (!r.ok) {
        setResidents([])
        return
      }
      const j = (await r.json()) as { residents?: Resident[] }
      setResidents(j.residents ?? [])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch()
    }, 280)
    return () => window.clearTimeout(t)
  }, [runSearch])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 px-4 py-6">
        <PageHeader
          title="Residents"
          description="Search by name or room, then open the shared resident profile."
        />
        <div className="flex min-h-12 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="min-h-12 w-full pl-9"
              placeholder="Search by name or room number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
          </div>
          <Button type="button" variant="secondary" className="min-h-12 sm:w-28" onClick={() => void runSearch()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        {loading && residents.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Care</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-[1%] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No residents match.
                    </TableCell>
                  </TableRow>
                ) : (
                  residents.map((r) => {
                    const name = `${r.firstName} ${r.lastName}`.trim()
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.roomNumber || "—"}</TableCell>
                        <TableCell>{name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatCare(r.careLevel || "")}</TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">{r.status ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild className="min-h-9" size="sm" variant="outline">
                            <Link href={`/residents/${encodeURIComponent(r.id)}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
