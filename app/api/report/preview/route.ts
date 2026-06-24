import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import { NextResponse } from "next/server"
import {
  generateClinicalRecord,
  type ClinicalRecord,
  type ClinicalRecordInput,
} from "@/lib/agents/clinical-record-generator"
import {
  generateClinicalPreviewInsights,
  type ClinicalPreviewInsights,
} from "@/lib/agents/clinical-preview-insights"
import { getCurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"
import {
  extendReportSession,
  getReportSession,
  updateReportSession,
  type ReportSession,
} from "@/lib/config/report-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function buildQaArray(
  questions: Array<{ id: string; text: string; areaHint?: string; label?: string }>,
  answers: Record<string, string>,
  defaultAreaHint: string,
) {
  return questions
    .filter((q) => (answers[q.id] ?? "").trim().length > 0)
    .map((q) => ({
      question: q.text,
      answer: (answers[q.id] ?? "").trim(),
      areaHint: q.areaHint?.trim() || defaultAreaHint,
    }))
}

function sessionToClinicalInput(session: ReportSession): ClinicalRecordInput {
  return {
    fullNarrative: session.fullNarrative,
    tier1Questions: session.tier1Questions,
    tier1Answers: session.tier1Answers,
    tier2Questions: session.tier2Questions,
    tier2Answers: session.tier2Answers,
    closingQuestions: session.closingQuestions,
    closingAnswers: session.closingAnswers,
    incidentType: session.incidentType,
    residentName: session.residentName,
    location: session.location,
  }
}

function allTier2QuestionsForPreview(session: ReportSession) {
  const seen = new Map<string, { id: string; text: string; areaHint: string }>()
  for (const dp of session.dataPointsPerQuestion) {
    if (!seen.has(dp.questionId)) {
      seen.set(dp.questionId, {
        id: dp.questionId,
        text: dp.questionText?.trim() || "Follow-up question",
        areaHint: "Follow-up",
      })
    }
  }
  for (const q of session.tier2Questions) {
    seen.set(q.id, { id: q.id, text: q.text, areaHint: "Follow-up" })
  }
  for (const id of Object.keys(session.tier2Answers)) {
    if (!seen.has(id)) {
      seen.set(id, { id, text: "Follow-up question", areaHint: "Follow-up" })
    }
  }
  return [...seen.values()]
}

async function resolveClinicalRecord(session: ReportSession): Promise<ClinicalRecord> {
  if (session.generatedClinicalRecord) {
    return session.generatedClinicalRecord
  }
  return generateClinicalRecord(sessionToClinicalInput(session))
}

async function resolvePreviewInsights(
  session: ReportSession,
  clinicalRecord: ClinicalRecord,
): Promise<ClinicalPreviewInsights> {
  if (session.generatedPreviewInsights) {
    return session.generatedPreviewInsights
  }
  return generateClinicalPreviewInsights(sessionToClinicalInput(session), clinicalRecord)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }

  const session = await getReportSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
  }
  if (session.userId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const clinicalRecord = await resolveClinicalRecord(session)
    const previewInsights = await resolvePreviewInsights(session, clinicalRecord)

    await updateReportSession(sessionId, (s) => {
      s.generatedClinicalRecord = clinicalRecord
      s.generatedPreviewInsights = previewInsights
      s.reportPhase = "signoff"
      return s
    })

    await extendReportSession(sessionId, 3600)

    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")
    const incident = leanOne<{
      incidentDate?: Date
      incidentTime?: string
    }>(
      await IncidentModel.findOne({ id: session.incidentId, facilityId: session.facilityId })
        .select("incidentDate incidentTime")
        .lean()
        .exec(),
    )

    const facility = await FacilityModel.findOne({ id: session.facilityId }).select("name").lean().exec()
    const facilityName =
      typeof (facility as { name?: string } | null)?.name === "string"
        ? String((facility as { name?: string }).name).trim() || "Community"
        : "Community"

    const incidentDate =
      incident?.incidentDate instanceof Date
        ? incident.incidentDate.toISOString().split("T")[0]
        : session.startedAt.split("T")[0]
    const incidentTime =
      typeof incident?.incidentTime === "string" && incident.incidentTime.trim()
        ? incident.incidentTime.trim()
        : new Date(session.startedAt).toTimeString().slice(0, 5)

    return NextResponse.json({
      facilityName,
      clinicalRecord,
      incidentSummary: {
        incidentId: session.incidentId,
        incidentType: session.incidentType,
        residentName: session.residentName,
        residentRoom: session.residentRoom,
        location: session.location,
        staffName: session.userName,
        staffRole: session.userRole,
        incidentDate,
        incidentTime,
      },
      fullNarrative: session.fullNarrative,
      tier1QA: buildQaArray(session.tier1Questions, session.tier1Answers, "Narrative"),
      tier2QA: buildQaArray(allTier2QuestionsForPreview(session), session.tier2Answers, "Follow-up"),
      closingQA: buildQaArray(session.closingQuestions, session.closingAnswers, "Closing"),
      completenessScore: session.completenessScore,
      previewInsights,
    })
  } catch (error) {
    console.error("[report/preview] Error:", error)
    return NextResponse.json({ error: "Failed to generate clinical preview" }, { status: 500 })
  }
}
