"use client"

import { useEffect, useState } from "react"

import { AssessmentSummaryList } from "@/components/assessments/assessment-summary-list"
import { PageHeader } from "@/components/ui/page-header"
import type { AssessmentSummary } from "@/lib/types/assessment-summary"

export function StaffAssessmentsListClient() {
  const [rows, setRows] = useState<AssessmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/staff/assessments", { credentials: "include" })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          if (active) {
            setError(data.error ?? "Could not load assessments")
            setRows([])
          }
          return
        }
        const data = (await response.json()) as { assessments?: AssessmentSummary[] }
        if (active) {
          setError(null)
          setRows(data.assessments ?? [])
        }
      } catch {
        if (active) {
          setError("Could not load assessments")
          setRows([])
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <PageHeader
          title="Assessments"
          description="Due and recent assessments for your facility, with staff-safe details only."
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AssessmentSummaryList
          rows={rows}
          loading={loading}
          variant="staff"
          emptyTitle="No assessments due"
          emptyDescription="When an assessment is scheduled or becomes due, it will appear here."
        />
      </div>
    </div>
  )
}
