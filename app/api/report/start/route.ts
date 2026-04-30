import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import connectMongo from "@/backend/src/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"
import { createReportSession, type ReportSession } from "@/lib/config/report-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

function defaultPhase2SectionsForCreate() {
  return {
    contributingFactors: { status: "not_started" as const, factors: [] as string[] },
    rootCause: { status: "not_started" as const },
    interventionReview: { status: "not_started" as const, reviewedInterventions: [] as const },
    newIntervention: { status: "not_started" as const, interventions: [] as const },
  }
}

/** Prefer reported date/time for regulatory timers; fall back to server now. */
function resolveIncidentOccurredAt(incidentDate: string | undefined, incidentTime: string | undefined, fallback: Date): Date {
  if (incidentDate?.trim() && incidentTime?.trim()) {
    const combined = new Date(`${incidentDate.trim()}T${incidentTime.trim()}:00`)
    if (!Number.isNaN(combined.getTime())) return combined
  }
  if (incidentDate?.trim()) {
    const d = new Date(incidentDate.trim())
    if (!Number.isNaN(d.getTime())) return d
  }
  return fallback
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user.facilityId?.trim()) {
    return NextResponse.json({ error: "Facility ID required" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const incidentType = typeof body.incidentType === "string" ? body.incidentType.trim() : ""
  const residentId = typeof body.residentId === "string" ? body.residentId.trim() : ""
  const residentName = typeof body.residentName === "string" ? body.residentName.trim() : ""
  const residentRoom = typeof body.residentRoom === "string" ? body.residentRoom.trim() : ""
  const location = typeof body.location === "string" ? body.location.trim() : ""
  const incidentDate = typeof body.incidentDate === "string" ? body.incidentDate : undefined
  const incidentTime = typeof body.incidentTime === "string" ? body.incidentTime : undefined
  const injuryDescription =
    typeof body.injuryDescription === "string" ? body.injuryDescription.trim() : undefined
  const witnessesPresent = typeof body.witnessesPresent === "boolean" ? body.witnessesPresent : undefined

  let hasInjury: boolean | null = null
  if (body.hasInjury === true) hasInjury = true
  else if (body.hasInjury === false) hasInjury = false
  else if (body.hasInjury === null) hasInjury = null

  const required: Record<string, string> = {
    incidentType,
    residentName,
    residentRoom,
    location,
  }
  for (const [key, val] of Object.entries(required)) {
    if (!val) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 })
    }
  }

  const tier1Questions = TIER1_BY_TYPE[incidentType]
  if (!tier1Questions) {
    return NextResponse.json({ error: `Unsupported incident type: ${incidentType}` }, { status: 400 })
  }

  const incidentId = `inc-${uuidv4().replace(/-/g, "").slice(0, 12)}`
  const sessionId = uuidv4()
  const now = new Date()
  const occurredAt = resolveIncidentOccurredAt(incidentDate, incidentTime, now)
  const injuryConfirmed = hasInjury === true
  const stateReportDueAt = injuryConfirmed
    ? new Date(occurredAt.getTime() + 2 * 60 * 60 * 1000)
    : undefined

  const staffName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown"
  const title = `${incidentType.charAt(0).toUpperCase() + incidentType.slice(1)} — ${residentName}`
  const description = `${incidentType} incident reported for ${residentName} in ${location}`

  try {
    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")

    const incidentPayload: Record<string, unknown> = {
      id: incidentId,
      facilityId: user.facilityId,
      organizationId: user.organizationId || undefined,
      companyId: user.organizationId || undefined,
      incidentType,
      title,
      description,
      residentName,
      residentRoom,
      location,
      incidentDate: incidentDate ? new Date(incidentDate) : now,
      incidentTime: incidentTime ?? now.toTimeString().slice(0, 5),
      witnessesPresent,
      staffId: user.userId,
      staffName,
      phase: "phase_1_in_progress",
      status: "in-progress",
      priority: injuryConfirmed ? "urgent" : "medium",
      completenessScore: 0,
      createdAt: now,
      updatedAt: now,
      phaseTransitionTimestamps: {
        phase1Started: now,
      },
      redFlags: {
        hasInjury: injuryConfirmed,
        carePlanViolated: false,
        ...(stateReportDueAt ? { stateReportDueAt } : {}),
        notificationSentToAdmin: false,
      },
      investigation: {
        status: "not-started",
      },
      questions: [],
      tier2QuestionsGenerated: 0,
      questionsAnswered: 0,
      questionsDeferred: 0,
      questionsMarkedUnknown: 0,
      activeDataCollectionSeconds: 0,
      completenessAtTier1Complete: 0,
      completenessAtSignoff: 0,
      dataPointsPerQuestion: [],
      phase2Sections: defaultPhase2SectionsForCreate(),
      auditTrail: [],
    }

    if (residentId) {
      incidentPayload.residentId = residentId
    }
    if (hasInjury !== null) {
      incidentPayload.hasInjury = hasInjury
    }
    if (injuryConfirmed && injuryDescription) {
      incidentPayload.injuryDescription = injuryDescription
    }

    await IncidentModel.create(incidentPayload)

    const session: ReportSession = {
      sessionId,
      incidentId,
      facilityId: user.facilityId,
      userId: user.userId,
      userName: staffName,
      userRole: user.roleSlug,

      incidentType,
      residentId,
      residentName,
      residentRoom,
      location,
      hasInjury,

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
      tier2QuestionsGenerated: 0,

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
        tier: "tier1" as const,
        allowDefer: q.allowDefer,
        required: q.required,
      })),
      completenessScore: 0,
      phase: "tier1",
    })
  } catch (error) {
    console.error("[api/report/start]", error)
    return NextResponse.json({ error: "Failed to create incident report" }, { status: 500 })
  }
}
