/**
 * POST /api/report/start — entry point for the unified incident reporting flow.
 *
 * Creates the IncidentModel record, provisions a `ReportSession` in Redis,
 * and returns the Tier 1 question board for the frontend. See
 * documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §2.
 */

import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"

import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { TIER1_BY_TYPE, CLOSING_QUESTIONS } from "@/lib/config/tier1-questions"
import {
  createReportSession,
  type ReportSession,
} from "@/lib/config/report-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface StartRequestBody {
  incidentType?: string
  residentId?: string
  residentName?: string
  residentRoom?: string
  location?: string
  incidentDate?: string
  incidentTime?: string
  hasInjury?: boolean | null
  injuryDescription?: string
  witnessesPresent?: boolean
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (!user.facilityId) {
    return NextResponse.json({ error: "Facility ID required" }, { status: 400 })
  }

  let body: StartRequestBody
  try {
    body = (await request.json()) as StartRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    incidentType,
    residentId,
    residentName,
    residentRoom,
    location,
    incidentDate,
    incidentTime,
    hasInjury = null,
    injuryDescription,
    witnessesPresent,
  } = body

  // Validate required fields per blueprint §2
  const requiredFields: Array<[string, unknown]> = [
    ["incidentType", incidentType],
    ["residentName", residentName],
    ["residentRoom", residentRoom],
    ["location", location],
  ]
  for (const [name, value] of requiredFields) {
    if (!isNonEmptyString(value)) {
      return NextResponse.json({ error: `${name} is required` }, { status: 400 })
    }
  }

  const tier1Questions = TIER1_BY_TYPE[incidentType as string]
  if (!tier1Questions) {
    return NextResponse.json(
      { error: `Unsupported incident type: ${incidentType}` },
      { status: 400 },
    )
  }

  const incidentId = `inc-${uuidv4().slice(0, 8)}`
  const sessionId = uuidv4()

  try {
    await connectMongo()

    const now = new Date()
    const parsedIncidentDate = isNonEmptyString(incidentDate) ? new Date(incidentDate) : now
    const incidentDateValid = !Number.isNaN(parsedIncidentDate.getTime())
    const effectiveIncidentDate = incidentDateValid ? parsedIncidentDate : now
    const stateReportDueAt =
      hasInjury === true ? new Date(now.getTime() + 2 * 60 * 60 * 1000) : undefined

    const reporterName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "Unknown"
    const titleType =
      (incidentType as string).charAt(0).toUpperCase() + (incidentType as string).slice(1)

    await IncidentModel.create({
      id: incidentId,
      facilityId: user.facilityId,
      organizationId: user.organizationId || user.facilityId,
      companyId: user.organizationId || user.facilityId,
      incidentType,
      title: `${titleType} — ${residentName}`,
      description: `${incidentType} incident reported for ${residentName} in ${location}`,
      ...(isNonEmptyString(residentId) ? { residentId } : {}),
      residentName,
      residentRoom,
      location,
      incidentDate: effectiveIncidentDate,
      incidentTime: isNonEmptyString(incidentTime)
        ? incidentTime
        : now.toTimeString().slice(0, 5),
      hasInjury: hasInjury ?? undefined,
      ...(hasInjury === true && isNonEmptyString(injuryDescription) ? { injuryDescription } : {}),
      ...(typeof witnessesPresent === "boolean" ? { witnessesPresent } : {}),
      staffId: user.userId,
      staffName: reporterName,
      phase: "phase_1_in_progress",
      status: "in-progress",
      priority: hasInjury === true ? "urgent" : "medium",
      completenessScore: 0,
      tier2QuestionsGenerated: 0,
      questionsAnswered: 0,
      questionsDeferred: 0,
      questionsMarkedUnknown: 0,
      activeDataCollectionSeconds: 0,
      completenessAtTier1Complete: 0,
      completenessAtSignoff: 0,
      dataPointsPerQuestion: [],
      createdAt: now,
      updatedAt: now,
      phaseTransitionTimestamps: {
        phase1Started: now,
      },
      redFlags: {
        hasInjury: hasInjury === true,
        carePlanViolated: false,
        ...(stateReportDueAt ? { stateReportDueAt } : {}),
        notificationSentToAdmin: false,
      },
      auditTrail: [],
    })

    const session: ReportSession = {
      sessionId,
      incidentId,
      facilityId: user.facilityId,
      organizationId: user.organizationId || user.facilityId,
      userId: user.userId,
      userName: reporterName,
      userRole: user.roleSlug,

      incidentType: incidentType as string,
      residentId: isNonEmptyString(residentId) ? residentId : "",
      residentName: residentName as string,
      residentRoom: residentRoom as string,
      location: location as string,
      hasInjury: hasInjury ?? null,

      reportPhase: "tier1",

      tier1Questions,
      tier1Answers: {},
      tier1CompletedAt: null,

      fullNarrative: "",

      agentState: null,

      tier2Questions: [],
      tier2Answers: {},
      tier2DeferredIds: [],
      tier2UnknownIds: [],

      closingQuestions: CLOSING_QUESTIONS,
      closingAnswers: {},

      activeDataCollectionMs: 0,
      dataPointsPerQuestion: [],

      completenessScore: 0,
      completenessAtTier1: 0,

      startedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    }

    await createReportSession(session)

    return NextResponse.json({
      sessionId,
      incidentId,
      tier1Questions: tier1Questions.map((q) => ({
        id: q.id,
        text: q.text,
        label: q.label,
        areaHint: q.areaHint,
        tier: q.tier,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: 0,
      phase: "tier1" as const,
    })
  } catch (error) {
    console.error("[report/start] Error:", error)
    return NextResponse.json(
      { error: "Failed to create incident report" },
      { status: 500 },
    )
  }
}
