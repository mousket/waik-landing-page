"use client"

import { useEffect, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

const DOCS_URL = "https://waik.care"

export default function AdminSettingsHelpPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = getAdminContextQueryString(searchParams)
  const [facilityId, setFacilityId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const res = await fetch(`/api/admin/facility${apiCtx}`)
      if (!res.ok) return
      const j = (await res.json()) as { facility?: { id: string } }
      if (alive) setFacilityId(j.facility?.id ?? null)
    })()
    return () => {
      alive = false
    }
  }, [apiCtx])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:py-8">
        <PageHeader title="Help" description="Facility reference and how to get support." />
        <WaikCard>
          <WaikCardContent className="space-y-4 p-6">
            <div>
              <CardTitle>Facility ID</CardTitle>
              <CardDescription className="mt-1">Share this with WAiK support for faster lookup.</CardDescription>
            </div>
            <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 font-mono text-sm break-all">
              {facilityId ?? "Loading…"}
            </p>
            <div>
              <CardTitle>Support</CardTitle>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden />
                <a href="mailto:support@waik.care" className="font-medium text-primary hover:underline">
                  support@waik.care
                </a>
              </p>
            </div>
            <div>
              <CardTitle>Documentation</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Product updates and guides:{" "}
                <a href={DOCS_URL} className="font-medium text-primary hover:underline" rel="noreferrer" target="_blank">
                  {DOCS_URL}
                </a>
              </p>
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}
