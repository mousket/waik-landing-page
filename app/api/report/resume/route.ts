import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { getCurrentUser } from "@/lib/auth"
import { createReportSession, getReportSession, updateReportSession } from "@/lib/config/report-session"
import { ensureSessionAgentState } from "@/lib/report/agent-state-from-session"
import { reconcileReportSession } from "@/lib/report/reconcile-report-session"
import { persistReportCheckpoint } from "@/lib/report/checkpoint-incident"
import {
  buildReportSessionFromIncident,
  recreateReportSessionFromIncident,
  reportSessionToResumePayload,
} from "@/lib/report/reconstruct-session-from-incident"
import { leanOne } from "@/lib/mongoose-lean"
import { isIncidentReporter } from "@/lib/staff-incident-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const incidentId = searchParams.get("incidentId")?.trim() ?? ""
  if (!incidentId) {
    return NextResponse.json({ error: "incidentId query parameter required" }, { status: 400 })
  }

  await connectMongo()
  const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId, facilityId: user.facilityId }).lean().exec(),
  )

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 })
  }

  if (!isIncidentReporter(incident, user)) {
    return NextResponse.json({ error: "Only the reporter can resume this report" }, { status: 403 })
  }

  if (incident.phase !== "phase_1_in_progress") {
    return NextResponse.json(
      { error: "This incident is not an in-progress Phase 1 report" },
      { status: 400 },
    )
  }

  const staffName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown"
  const userCtx = {
    userId: user.userId,
    userName: staffName,
    userRole: user.roleSlug,
  }

  let session =
    (await loadActiveReportSession(incident, incidentId)) ??
    (await recreateReportSessionFromIncident(incident, userCtx)) ??
    buildReportSessionFromIncident(incident, userCtx)

  if (!session) {
    return NextResponse.json({ error: "Unsupported incident type for resume" }, { status: 400 })
  }

  const { session: reconciled, changed } = reconcileReportSession(session, incident)
  if (changed) {
    const inRedis = await getReportSession(reconciled.sessionId)
    session = inRedis
      ? await updateReportSession(reconciled.sessionId, () => reconciled)
      : await (async () => {
          await createReportSession(reconciled)
          return reconciled
        })()
  } else {
    session = reconciled
  }

  if (!session.agentState && session.reportPhase !== "tier1") {
    const restored = ensureSessionAgentState(session)
    if (restored) {
      const sid = session.sessionId
      session = await updateReportSession(sid, (s) => {
        s.agentState = restored
        return s
      })
    }
  }

  void persistReportCheckpoint(session).catch((err) =>
    console.warn("[report/resume] Background re-checkpoint failed:", err),
  )

  const hadSavedQuestions = (incident.questions ?? []).length > 0
  const warning = hadSavedQuestions
    ? "Session restored from saved report data."
    : "No answers were saved on this incident yet — Tier 1 questions have been restored so you can continue."

  return NextResponse.json(reportSessionToResumePayload(session, warning))
}

async function loadActiveReportSession(
  incident: IncidentDocument,
  incidentId: string,
): Promise<Awaited<ReturnType<typeof getReportSession>> | null> {
  const activeId = incident.activeReportSessionId?.trim()
  if (!activeId) return null
  const existing = await getReportSession(activeId)
  if (!existing || existing.incidentId !== incidentId) return null
  return existing
}
