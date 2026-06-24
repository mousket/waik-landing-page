"use client"

import Link from "next/link"
import { ArrowLeft, Download, Printer } from "lucide-react"

import { EmailPhase1ReportButton } from "@/components/staff/email-phase1-report-dialog"
import { Button } from "@/components/ui/button"

export function StaffPrintReportToolbar({
  backHref,
  incidentId,
  pdfUrl,
  defaultEmail,
}: {
  backHref: string
  incidentId: string
  pdfUrl?: string | null
  defaultEmail?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
      <Button asChild variant="outline" size="sm" className="rounded-xl">
        <Link href={backHref}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={() => window.print()}
      >
        <Printer className="mr-1.5 h-4 w-4" />
        Print
      </Button>
      <Button asChild variant="default" size="sm" className="rounded-xl">
        <a
          href={pdfUrl?.trim() || `/api/incidents/${encodeURIComponent(incidentId)}/report/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download PDF
        </a>
      </Button>
      <EmailPhase1ReportButton incidentId={incidentId} defaultEmail={defaultEmail} />
    </div>
  )
}
