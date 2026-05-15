"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export function ClosureReportToolbar(props: { backHref: string }) {
  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">Compliance</p>
        <h1 className="text-lg font-semibold text-foreground">Incident investigation report</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Print or save as PDF for regulatory or QA records.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-xl" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" asChild>
          <Link href={props.backHref}>Back to investigation</Link>
        </Button>
      </div>
    </div>
  )
}
