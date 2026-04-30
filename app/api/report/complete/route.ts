import connectMongo from "@/backend/src/lib/mongodb"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { NextResponse } from "next/server"
import { leanOne } from "@/lib/mongoose-lean"
import type { ClinicalRecord } from "@/lib/agents/clinical-record-generator"
import { generateClinicalRecord } from "@/lib/agents/clinical-record-generator"
import { deleteReportSession, getReportSession, type ReportSession } from "@/lib/config/report-session"
import { createNotification } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { WAIK_PHASE2_ROLES } from "@/lib/waik-roles"
import { generateAndStoreEmbedding } from "@/lib/agents/embedding-service"
import { generateCoachingTips } from "@/lib/agents/coaching-tips-generator"
import { verifyClinicalRecord } from "@/lib/agents/verification-agent"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function nonEmptyAnswerCount(rec: Record<string, string>): number {
  return Object.values(rec).filter((v) => (v ?? "").trim().length > 0).length
}

function closingQuestionsComplete(session: ReportSession): boolean {
  return session.closingQuestions.every((q) => (session.closingAnswers[q.id] ?? "").trim().length > 0)
}

function applyEditedSections(
  record: ClinicalRecord,
  edited: Partial<Record<keyof ClinicalRecord, string>> | undefined,
): void {
  if (!edited) return
  const keys: (keyof ClinicalRecord)[] = [
    "narrative",
    "residentStatement",
    "interventions",
    "contributingFactors",
    "recommendations",
    "environmentalAssessment",
  ]
  for (const k of keys) {
    const v = edited[k]
    if (typeof v === "string" && v.trim()) {
      record[k] = v.trim()
    }
  }
}

function buildEnhancedNarrative(record: ClinicalRecord): string {
  return [
    `DESCRIPTION OF INCIDENT:\n${record.narrative}`,
    `RESIDENT STATEMENT:\n${record.residentStatement}`,
    `IMMEDIATE INTERVENTIONS:\n${record.interventions}`,
    `CONTRIBUTING FACTORS:\n${record.contributingFactors}`,
    `RECOMMENDATIONS:\n${record.recommendations}`,
    `ENVIRONMENTAL ASSESSMENT:\n${record.environmentalAssessment}`,
  ].join("\n\n")
}

function toMillis(d: unknown): number {
  if (d instanceof Date) return d.getTime()
  if (typeof d === "string") return new Date(d).getTime()
  return 0
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
  const editedSections = body.editedSections as Partial<Record<keyof ClinicalRecord, string>> | undefined
  const signature = body.signature as { declaration?: string; signedAt?: string } | undefined

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }
  if (!signature?.declaration?.trim() || !signature?.signedAt) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 })
  }

  const signedAtDate = new Date(signature.signedAt)
  if (Number.isNaN(signedAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid signature.signedAt" }, { status: 400 })
  }

  const session = await getReportSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }
  if (session.userId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (session.reportPhase !== "signoff") {
    return NextResponse.json(
      { error: "Report is not ready for sign-off; complete all closing questions first." },
      { status: 400 },
    )
  }
  if (!closingQuestionsComplete(session)) {
    return NextResponse.json(
      { error: "All closing questions must be answered before sign-off." },
      { status: 400 },
    )
  }

  try {
    const clinicalRecord = await generateClinicalRecord({
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
    })

    applyEditedSections(clinicalRecord, editedSections)

    const enhancedNarrative = buildEnhancedNarrative(clinicalRecord)

    const verification = await verifyClinicalRecord({
      originalNarrative: session.fullNarrative,
      clinicalRecord,
    })
    if (verification.fidelityScore < 80) {
      console.warn(
        `[report/complete] Low clinical-record fidelity (${verification.fidelityScore}) for incident ${session.incidentId}`,
        { additions: verification.additions, omissions: verification.omissions },
      )
    }

    const verifiedAt = new Date()

    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")
    const { default: UserModel } = await import("@/backend/src/models/user.model")

    const existing = leanOne<Pick<IncidentDocument, "incidentDate" | "createdAt" | "redFlags">>(
      await IncidentModel.findOne({
        id: session.incidentId,
        facilityId: session.facilityId,
      })
        .select("incidentDate createdAt redFlags")
        .lean()
        .exec(),
    )

    const now = new Date()
    const injury = session.hasInjury === true
    const existingDue = existing?.redFlags?.stateReportDueAt
    let stateReportDueAt: Date | undefined
    if (injury && !existingDue) {
      const base = existing?.incidentDate ?? existing?.createdAt ?? now
      stateReportDueAt = new Date(new Date(base).getTime() + 2 * 60 * 60 * 1000)
    }

    const tier2Gen = session.tier2QuestionsGenerated ?? 0
    const questionsAnswered =
      nonEmptyAnswerCount(session.tier1Answers) +
      nonEmptyAnswerCount(session.tier2Answers) +
      nonEmptyAnswerCount(session.closingAnswers)

    const dataPointsPerQuestion = session.dataPointsPerQuestion.map((row) => ({
      questionId: row.questionId,
      dataPointsCovered: row.dataPointsCovered,
    }))

    const setDoc: Record<string, unknown> = {
      phase: "phase_1_complete",
      completenessScore: session.completenessScore,
      completenessAtSignoff: session.completenessScore,
      completenessAtTier1Complete: session.completenessAtTier1,
      tier2QuestionsGenerated: tier2Gen,
      questionsAnswered,
      questionsDeferred: session.tier2DeferredIds.length,
      questionsMarkedUnknown: session.tier2UnknownIds.length,
      activeDataCollectionSeconds: Math.round(session.activeDataCollectionMs / 1000),
      dataPointsPerQuestion,
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
        signedAt: signedAtDate,
        role: session.userRole,
        declaration: signature.declaration.trim(),
      },

      "investigation.status": "not-started",
      "investigation.goldStandard": session.agentState?.global_standards ?? null,
      "investigation.subTypeData": session.agentState?.sub_type_data ?? null,
      "investigation.subtype": session.agentState?.sub_type ?? null,
      "investigation.score": session.completenessScore,
      "investigation.completenessScore": session.completenessScore,

      "investigation.verificationResult": {
        fidelityScore: verification.fidelityScore,
        overallAssessment: verification.overallAssessment,
        additions: verification.additions,
        omissions: verification.omissions,
        enhancements: verification.enhancements,
        verifiedAt,
      },

      "phaseTransitionTimestamps.phase1Signed": now,

      "redFlags.hasInjury": injury,
      "redFlags.notificationSentToAdmin": existing?.redFlags?.notificationSentToAdmin ?? false,
      "redFlags.carePlanViolated": existing?.redFlags?.carePlanViolated ?? false,
    }

    if (stateReportDueAt) {
      setDoc["redFlags.stateReportDueAt"] = stateReportDueAt
    }

    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: setDoc,
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
    }).catch((err) => {
      console.warn("[report/complete] Embedding generation failed:", err)
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentIncidents = await IncidentModel.find({
      facilityId: session.facilityId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
      "phaseTransitionTimestamps.phase1Signed": { $gte: thirtyDaysAgo },
    })
      .select(["completenessAtSignoff", "staffId", "phaseTransitionTimestamps"])
      .lean()

    const facilityScores = recentIncidents
      .map((i) => Number(i.completenessAtSignoff) || 0)
      .filter((s) => s > 0)
    const facilityAverage =
      facilityScores.length > 0
        ? Math.round(facilityScores.reduce((a, b) => a + b, 0) / facilityScores.length)
        : 0

    const personalScores = recentIncidents
      .filter((i) => i.staffId === session.userId)
      .map((i) => Number(i.completenessAtSignoff) || 0)
      .filter((s) => s > 0)
    const personalAverage =
      personalScores.length > 0
        ? Math.round(personalScores.reduce((a, b) => a + b, 0) / personalScores.length)
        : session.completenessScore

    const staffHistory = await IncidentModel.find({
      facilityId: session.facilityId,
      staffId: session.userId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    })
      .select(["completenessAtSignoff", "phaseTransitionTimestamps"])
      .sort({ "phaseTransitionTimestamps.phase1Signed": -1 })
      .lean()

    let currentStreak = 0
    for (const inc of staffHistory) {
      const score = Number(inc.completenessAtSignoff) || 0
      if (score >= 85) currentStreak++
      else break
    }

    const chronological = [...staffHistory].sort(
      (a, b) =>
        toMillis(a.phaseTransitionTimestamps?.phase1Signed) -
        toMillis(b.phaseTransitionTimestamps?.phase1Signed),
    )
    let run = 0
    let bestStreak = 0
    for (const inc of chronological) {
      const score = Number(inc.completenessAtSignoff) || 0
      if (score >= 85) {
        run++
        bestStreak = Math.max(bestStreak, run)
      } else {
        run = 0
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak)

    const totalDataPoints = session.dataPointsPerQuestion.reduce((sum, q) => sum + q.dataPointsCovered, 0)

    const totalQuestionsAsked =
      session.tier1Questions.length + tier2Gen + session.closingQuestions.length

    const coachingTips = await generateCoachingTips({
      completenessScore: session.completenessScore,
      completenessAtTier1: session.completenessAtTier1,
      missedFields: session.agentState?.missingFields ?? [],
      capturedInTier1: session.agentState?.filledFields ?? [],
      totalQuestionsAsked,
      personalAverage,
      facilityAverage,
      incidentType: session.incidentType,
    })

    const reportCard = {
      completenessScore: session.completenessScore,
      facilityAverage,
      personalAverage,
      currentStreak,
      bestStreak,
      coachingTips,
      totalQuestionsAsked,
      totalActiveSeconds: Math.round(session.activeDataCollectionMs / 1000),
      dataPointsCaptured: totalDataPoints,
    }

    try {
      const admins = await UserModel.find({
        facilityId: session.facilityId,
        roleSlug: { $in: [...WAIK_PHASE2_ROLES] },
        isActive: true,
      })
        .select(["id"])
        .lean()

      const msg = `Investigation ready — Room ${session.residentRoom}. Phase 1 complete for ${session.incidentType} incident. Tap /admin/incidents/${session.incidentId} to review.`

      for (const admin of admins) {
        const targetUserId = admin.id
        if (!targetUserId) continue
        await createNotification({
          incidentId: session.incidentId,
          type: "investigation-ready",
          message: msg,
          targetUserId,
        })
      }
    } catch (err) {
      console.error("[report/complete] Failed to create notifications:", err)
    }

    await deleteReportSession(sessionId)

    return NextResponse.json({
      status: "completed",
      incidentId: session.incidentId,
      reportCard,
    })
  } catch (error) {
    console.error("[report/complete] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to complete report. Your data has been preserved in the session.",
      },
      { status: 500 },
    )
  }
}
