"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loader2 } from "lucide-react"

type Week = { weekKey: string; weekLabel: string; avg: number; count: number }

type Props = {
  contextQuery: string
}

export default function IntelligenceCompletenessChart({ contextQuery }: Props) {
  const [rows, setRows] = useState<Week[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    setErr(null)
    try {
      const r = await fetch(`/api/admin/intelligence/completeness-trend${contextQuery}`, {
        credentials: "include",
      })
      if (!r.ok) {
        setErr("Could not load trend")
        return
      }
      const j = (await r.json()) as { weeks?: Week[] }
      setRows(j.weeks ?? [])
    } catch {
      setErr("Could not load trend")
    }
  }, [contextQuery])

  useEffect(() => {
    void load()
  }, [load])

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>
  }
  if (rows === null) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (rows.every((r) => r.count === 0)) {
    return (
      <p className="text-sm text-muted-foreground">
        No incident reports in the last 8 weeks in this community; chart will fill in as data arrives.
      </p>
    )
  }

  return (
    <div className="h-48 w-full" role="img" aria-label="Phase 1 documentation completeness by week, last 8 weeks">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={56}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} unit="%" />
          <Tooltip
            formatter={(v: number) => [`${v}%`, "Average"]}
            labelFormatter={(_, p) => {
              const p0 = p?.[0] as { payload?: { weekLabel?: string; count?: number } } | undefined
              const pay = p0?.payload
              if (!pay) return ""
              return `${pay.weekLabel ?? ""} · reports: ${pay.count ?? 0}`
            }}
          />
          <Bar
            dataKey="avg"
            name="Avg Phase 1 completeness"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
