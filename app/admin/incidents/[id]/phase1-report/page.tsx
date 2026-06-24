import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { Phase1SignedReportView } from "@/components/staff/phase1-signed-report-view"
import { StaffPrintReportToolbar } from "@/components/staff/staff-print-report-toolbar"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { getCurrentUser } from "@/lib/auth"
import { getIncidentForUser } from "@/lib/db"
import { leanOne } from "@/lib/mongoose-lean"
import { buildPhase1SignedReportViewModel } from "@/lib/report/phase1-signed-report-data"

const SIGNED_PHASES = new Set(["phase_1_complete", "phase_2_in_progress", "closed"])

function canAdminViewPhase1Report(user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  if (!user) return false
  return Boolean(user.isWaikSuperAdmin || user.isAdminTier)
}

export default async function AdminPhase1ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const incidentId = String(id ?? "").trim()
  if (!incidentId) notFound()

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (!canAdminViewPhase1Report(user)) notFound()

  const scope = await getIncidentForUser(incidentId, user)
  if (scope.kind !== "ok") notFound()

  const sp = new URLSearchParams()
  const rawSearch = await searchParams
  for (const [key, value] of Object.entries(rawSearch)) {
    if (typeof value === "string") sp.set(key, value)
    else if (Array.isArray(value) && value[0]) sp.set(key, value[0])
  }

  const facilityId = scope.incident.facilityId ?? user.facilityId?.trim()
  if (!facilityId) notFound()

  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId, facilityId }).lean().exec(),
  )
  if (!incident) notFound()

  const phase = String(incident.phase ?? "")
  const backHref = buildAdminPathWithContext(`/admin/incidents/${incidentId}`, sp)

  if (!SIGNED_PHASES.has(phase)) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 text-foreground">
        <div className="mx-auto max-w-full px-4 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <StaffPrintReportToolbar backHref={backHref} incidentId={incidentId} defaultEmail={user.email} />
          <p className="text-sm text-muted-foreground">
            The signed Phase 1 record is available after the reporting nurse completes sign-off.
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-primary underline">
            Back to incident
          </Link>
        </div>
      </div>
    )
  }

  const facility = await FacilityModel.findOne({ id: facilityId }).select("name").lean().exec()
  const communityName =
    typeof (facility as { name?: string } | null)?.name === "string"
      ? String((facility as { name?: string }).name).trim() || "Community"
      : "Community"

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
