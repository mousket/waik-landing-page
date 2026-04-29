/**
 * POST /api/report/complete — sign-off, clinical record, report card.
 *
 * The culmination of the incident reporting flow. Generates a structured
 * clinical record from the full narrative, writes the final state to
 * MongoDB (initialReport + investigation + analytics + audit trail),
 * fires Phase 2 notifications for facility admins, deletes the Redis
 * session, and returns the report card.
 *
 * See documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §2.
 */

import { NextResponse } from "next/server"

import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import UserModel from "@/backend/src/models/user.model"

import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import {
  buildEnhancedNarrative,
  generateClinicalRecord,
  type ClinicalRecord,
} from "@/lib/agents/clinical-record-generator"
import { generateAndStoreEmbedding } from "@/lib/agents/embedding-service"
import {
  deleteReportSession,
  getReportSession,
  type ReportSession,
} from "@/lib/config/report-session"
import { createNotification } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Streak threshold for "great report" badge (%). */
const STREAK_THRESHOLD = 85

/** Roles that should receive the Phase 2 ready notification. */
const ADMIN_ROLE_SLUGS = [
  "director_of_nursing",
  "administrator",
  "owner",
  "head_nurse",
] as const

interface CompleteRequestBody {
  sessionId?: string
  editedSections?: Partial<ClinicalRecord>
  signature?: {
    declaration?: string
    signedAt?: string
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  let body: CompleteRequestBody
  try {
    body = (await request.json()) as CompleteRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { sessionId, editedSections, signature } = body

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 },
    )
  }
  if (!signature?.declaration || !signature?.signedAt) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 })
  }

  const session = await getReportSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 },
    )
  }
  if (session.userId !== user.userId) {
    return NextResponse.json(
      { error: "Session does not belong to this user" },
      { status: 403 },
    )
  }

  try {
    // 1. Generate clinical record from raw narrative + answers
    const generated = await generateClinicalRecord({
      fullNarrative: session.fullNarrative,
      tier1Answers: labelAnswers(session.tier1Answers, session, "tier1"),
      tier2Answers: labelAnswers(session.tier2Answers, session, "tier2"),
      closingAnswers: labelAnswers(session.closingAnswers, session, "closing"),
      incidentType: session.incidentType,
      residentName: session.residentName,
      location: session.location,
    })

    // 2. Apply nurse edits — they override generated sections only.
    //    The raw fullNarrative is preserved verbatim in initialReport.narrative.
    const clinicalRecord: ClinicalRecord = {
      ...generated,
      ...stripEmptyEdits(editedSections),
    }

    const enhancedNarrative = buildEnhancedNarrative(clinicalRecord)

    // 3. Persist final state to MongoDB
    const now = new Date()
    const signedAt = new Date(signature.signedAt)

    await connectMongo()

    const questionsAnsweredTotal =
      countAnswered(session.tier1Answers) +
      countAnswered(session.tier2Answers) +
      countAnswered(session.closingAnswers)

    const dataPointsCaptured = session.dataPointsPerQuestion.reduce(
      (sum, d) => sum + (d.dataPointsCovered || 0),
      0,
    )

    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          phase: "phase_1_complete",
          completenessScore: session.completenessScore,
          completenessAtSignoff: session.completenessScore,
          completenessAtTier1Complete: session.completenessAtTier1,
          tier2QuestionsGenerated: session.tier2Questions.length,
          questionsAnswered: questionsAnsweredTotal,
          questionsDeferred: session.tier2DeferredIds.length,
          questionsMarkedUnknown: session.tier2UnknownIds.length,
          activeDataCollectionSeconds: Math.round(
            session.activeDataCollectionMs / 1000,
          ),
          dataPointsPerQuestion: session.dataPointsPerQuestion.map((d) => ({
            questionId: d.questionId,
            dataPointsCovered: d.dataPointsCovered,
          })),
          summary: clinicalRecord.narrative.slice(0, 500),
          updatedAt: now,

          "initialReport.capturedAt": now,
          "initialReport.narrative": session.fullNarrative,
          "initialReport.enhancedNarrative": enhancedNarrative,
          "initialReport.recordedById": session.userId,
          "initialReport.recordedByName": session.userName,
          "initialReport.recordedByRole": session.userRole,
          "initialReport.signature": {
            signedBy: session.userId,
            signedByName: session.userName,
            signedAt,
            role: session.userRole,
            declaration: signature.declaration,
          },

          "investigation.status": "not-started",
          "investigation.subtype": session.agentState?.sub_type ?? undefined,
          "investigation.goldStandard":
            session.agentState?.global_standards ?? null,
          "investigation.subTypeData":
            session.agentState?.sub_type_data ?? null,
          "investigation.score": session.completenessScore,
          "investigation.completenessScore": session.completenessScore,

          "phaseTransitionTimestamps.phase1Signed": now,

          "redFlags.hasInjury": session.hasInjury === true,
        },
        $push: {
          auditTrail: {
            action: "signed",
            performedBy: session.userId,
            performedByName: session.userName,
            timestamp: now,
          },
        },
      },
    )

    // 4. Build report card (uses already-saved incident in aggregations)
    const reportCard = await buildReportCard(session, dataPointsCaptured)

    // 5. Phase 2 notifications — best effort, non-fatal
    await fireAdminNotifications(session).catch((err) => {
      console.error("[report/complete] Notification dispatch failed:", err)
    })

    // 5.5 Generate and store incident embedding — fire-and-forget,
    // never blocks the user-facing sign-off path.
    void generateAndStoreEmbedding({
      incidentId: session.incidentId,
      facilityId: session.facilityId,
      clinicalRecord,
      metadata: {
        incidentType: session.incidentType,
        residentName: session.residentName,
        residentRoom: session.residentRoom,
        location: session.location,
        incidentDate: session.startedAt,
      },
    })

    // 6. Delete Redis session
    await deleteReportSession(sessionId).catch((err) => {
      console.error("[report/complete] Failed to delete Redis session:", err)
    })

    return NextResponse.json({
      status: "completed",
      incidentId: session.incidentId,
      reportCard,
    })
  } catch (error) {
    console.error("[report/complete] Error:", error)
    return NextResponse.json(
      {
        error:
          "Failed to complete report. Your data has been preserved in the session.",
      },
      { status: 500 },
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function countAnswered(answers: Record<string, string>): number {
  return Object.values(answers).filter((v) => (v ?? "").trim().length > 0).length
}

function labelAnswers(
  answers: Record<string, string>,
  session: ReportSession,
  tier: "tier1" | "tier2" | "closing",
): Record<string, string> {
  const board =
    tier === "tier1"
      ? session.tier1Questions
      : tier === "tier2"
        ? session.tier2Questions
        : session.closingQuestions
  const labelled: Record<string, string> = {}
  for (const q of board) {
    const value = answers[q.id]
    if (value && value.trim().length > 0) {
      labelled[`[${q.areaHint}] ${q.text}`] = value.trim()
    }
  }
  return labelled
}

function stripEmptyEdits(
  edits: Partial<ClinicalRecord> | undefined,
): Partial<ClinicalRecord> {
  if (!edits) return {}
  const out: Partial<ClinicalRecord> = {}
  for (const k of Object.keys(edits) as (keyof ClinicalRecord)[]) {
    const v = edits[k]
    if (typeof v === "string" && v.trim().length > 0) out[k] = v.trim()
  }
  return out
}

async function buildReportCard(
  session: ReportSession,
  dataPointsCaptured: number,
) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [recentFacility, staffHistory] = await Promise.all([
    IncidentModel.find({
      facilityId: session.facilityId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
      "phaseTransitionTimestamps.phase1Signed": { $gte: since },
    })
      .select("completenessAtSignoff staffId")
      .lean(),
    IncidentModel.find({
      facilityId: session.facilityId,
      staffId: session.userId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    })
      .sort({ "phaseTransitionTimestamps.phase1Signed": -1 })
      .select("completenessAtSignoff")
      .lean(),
  ])

  const facilityScores = recentFacility
    .map((i) => i.completenessAtSignoff ?? 0)
    .filter((s) => s > 0)
  const facilityAverage =
    facilityScores.length > 0
      ? Math.round(
          facilityScores.reduce((a, b) => a + b, 0) / facilityScores.length,
        )
      : 0

  const personalScores = recentFacility
    .filter((i) => i.staffId === session.userId)
    .map((i) => i.completenessAtSignoff ?? 0)
    .filter((s) => s > 0)
  const personalAverage =
    personalScores.length > 0
      ? Math.round(
          personalScores.reduce((a, b) => a + b, 0) / personalScores.length,
        )
      : session.completenessScore

  let currentStreak = 0
  for (const inc of staffHistory) {
    if ((inc.completenessAtSignoff ?? 0) >= STREAK_THRESHOLD) {
      currentStreak += 1
    } else {
      break
    }
  }

  const coachingTips: string[] = []
  if (session.completenessScore >= STREAK_THRESHOLD) {
    coachingTips.push(
      "Excellent report. Your narratives are thorough and clinically complete.",
    )
  }
  if (session.completenessAtTier1 > 40) {
    coachingTips.push(
      "Strong opening — your Tier 1 narrative covered many data points before follow-up questions were needed.",
    )
  } else {
    coachingTips.push(
      "Next time, try to include details about the environment, footwear, and medication changes in your opening narrative — this reduces follow-up questions.",
    )
  }

  const totalQuestionsAsked =
    session.tier1Questions.length +
    session.tier2Questions.length +
    session.closingQuestions.length

  return {
    completenessScore: session.completenessScore,
    facilityAverage,
    personalAverage,
    currentStreak,
    bestStreak: currentStreak, // best-streak persistence is a future task
    coachingTips,
    totalQuestionsAsked,
    totalActiveSeconds: Math.round(session.activeDataCollectionMs / 1000),
    dataPointsCaptured,
  }
}

async function fireAdminNotifications(session: ReportSession): Promise<void> {
  await connectMongo()
  const admins = await UserModel.find({
    facilityId: session.facilityId,
    roleSlug: { $in: ADMIN_ROLE_SLUGS },
  })
    .select("id")
    .lean()

  if (admins.length === 0) return

  const message = `Investigation ready — ${session.incidentType} incident for ${session.residentName} (Room ${session.residentRoom}). Phase 1 complete; tap to review.`

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        incidentId: session.incidentId,
        type: "investigation-started",
        message,
        targetUserId: admin.id,
      }).catch((err) => {
        console.error(
          `[report/complete] Notification for ${admin.id} failed:`,
          err,
        )
      }),
    ),
  )
}
