"use client"

import { useCallback, useEffect, useState } from "react"
import { ResidentDirectorySearch } from "@/components/residents/resident-directory-search"
import { ResidentDirectoryTable } from "@/components/residents/resident-directory-table"
import { PageHeader } from "@/components/ui/page-header"
import type { ResidentDirectoryRow } from "@/lib/types/resident-directory"

export function StaffResidentsSearchClient() {
  const [q, setQ] = useState("")
  const [residents, setResidents] = useState<ResidentDirectoryRow[]>([])
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
      const j = (await r.json()) as { residents?: ResidentDirectoryRow[] }
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
        <ResidentDirectorySearch
          value={q}
          onChange={setQ}
          onSubmit={() => void runSearch()}
          loading={loading}
          showSubmitButton
        />
        <ResidentDirectoryTable
          residents={residents}
          loading={loading && residents.length === 0}
          variant="staff"
          emptyMessage="No residents match."
          getResidentHref={(resident) => `/residents/${encodeURIComponent(resident.id)}`}
        />
      </div>
    </div>
  )
}
