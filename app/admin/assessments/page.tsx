"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { buildAdminPathWithContext, getAdminContextQueryString } from "@/lib/admin-nav-context"
import { AssessmentSummaryList } from "@/components/assessments/assessment-summary-list"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import type { AssessmentSummary } from "@/lib/types/assessment-summary"

export default function AdminAssessmentsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [rows, setRows] = useState<AssessmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments${apiCtx}`, { credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Could not load assessments")
        setRows([])
        return
      }
      const j = (await res.json()) as { assessments?: AssessmentSummary[] }
      setRows(j.assessments ?? [])
    } catch {
      setError("Could not load assessments")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:py-10">
        <PageHeader
          className="mb-6"
          title="Assessments"
          description="Assessment records for the selected facility."
        />
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        <WaikCard>
          <WaikCardContent className="space-y-0 p-6">
            <AssessmentSummaryList
              rows={rows}
              loading={loading}
              variant="admin"
              emptyTitle="No assessment records"
              emptyDescription="Assessment records for the selected facility will appear here."
              getAdminHref={(assessment) =>
                buildAdminPathWithContext(`/residents/${assessment.residentId}`, searchParams)
              }
            />
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
