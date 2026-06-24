import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { Phase1SignedReportView } from "@/components/staff/phase1-signed-report-view"
import { StaffPrintReportToolbar } from "@/components/staff/staff-print-report-toolbar"
import { getCurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"
import { buildPhase1SignedReportViewModel } from "@/lib/report/phase1-signed-report-data"
import { isIncidentReporter } from "@/lib/staff-incident-access"

export default async function StaffPhase1ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const incidentId = String(id ?? "").trim()
  if (!incidentId) notFound()

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const facilityId = user.facilityId?.trim()
  if (!facilityId) notFound()

  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId, facilityId }).lean().exec(),
  )
  if (!incident) notFound()
  if (!isIncidentReporter(incident, user)) {
    redirect(`/staff/incidents/${incidentId}`)
  }

  const facility = await FacilityModel.findOne({ id: facilityId }).select("name").lean().exec()
  const communityName =
    typeof (facility as { name?: string } | null)?.name === "string"
      ? String((facility as { name?: string }).name).trim() || "Community"
      : "Community"

  const backHref = `/staff/incidents/${incidentId}`
  const phase = String(incident.phase ?? "")

  if (phase === "phase_1_in_progress") {
    return (
      <div className="min-h-screen bg-background px-4 py-8 text-foreground">
        <div className="mx-auto max-w-full px-4 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <StaffPrintReportToolbar backHref={backHref} incidentId={incidentId} />
          <p className="text-sm text-muted-foreground">
            Your report is not yet complete. Submit your report to access the signed record.
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-primary underline">
            Back to incident
          </Link>
        </div>
      </div>
    )
  }

  const sig = incident.initialReport?.signature
  const viewModel = buildPhase1SignedReportViewModel(incident, communityName)

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white">
      <div className="mx-auto max-w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl print:max-w-none">
        <div className="px-4 pt-6 sm:px-6 md:px-8 print:hidden">
          <StaffPrintReportToolbar
            backHref={backHref}
            incidentId={incidentId}
            pdfUrl={sig?.reportPdfUrl}
            defaultEmail={user.email}
          />
        </div>
        <Phase1SignedReportView {...viewModel} />
      </div>
    </div>
  )
}
