"use client"

import { ClinicalReportPreview } from "@/components/staff/clinical-report-preview"
import type { Phase1SignedReportViewModel } from "@/lib/report/phase1-signed-report-data"

export function Phase1SignedReportView({
  previewData,
  signedSignature,
}: Phase1SignedReportViewModel) {
  return (
    <ClinicalReportPreview
      mode="readonly"
      previewData={previewData}
      signedSignature={signedSignature}
    />
  )
}
