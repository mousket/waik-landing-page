import connectMongo from "@/backend/src/lib/mongodb"
import type { ReportSession } from "@/lib/config/report-session"
import {
  buildIncidentDraftFromSession,
  buildQuestionsFromReportSession,
} from "@/lib/report/sync-session-to-incident"

/**
 * Mirror Redis report session to MongoDB (non-blocking for nurse-facing responses).
 */
export async function persistReportCheckpoint(session: ReportSession): Promise<void> {
  try {
    await connectMongo()
    const { default: IncidentModel } = await import("@/backend/src/models/incident.model")
    const questions = buildQuestionsFromReportSession(session)
    const draft = buildIncidentDraftFromSession(session)
    const now = new Date()

    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          questions,
          completenessScore: draft.completenessScore,
          completenessAtTier1Complete: draft.completenessAtTier1Complete,
          tier2QuestionsGenerated: draft.tier2QuestionsGenerated,
          questionsAnswered: draft.questionsAnswered,
          questionsDeferred: draft.questionsDeferred,
          questionsMarkedUnknown: draft.questionsMarkedUnknown,
          activeReportSessionId: draft.activeReportSessionId,
          activeReportPhase: draft.activeReportPhase,
          activeReportAgentState: draft.activeReportAgentState ?? null,
          ...(draft.initialReport ? { initialReport: draft.initialReport } : {}),
          updatedAt: now,
        },
      },
    ).exec()
  } catch (error) {
    console.error(
      `[report/checkpoint] Failed to persist incident ${session.incidentId}:`,
      error,
    )
  }
}
