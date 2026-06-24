import { v4 as uuidv4 } from "uuid"

import type { IncidentDocument } from "@/backend/src/models/incident.model"
import { CLOSING_QUESTIONS, TIER1_BY_TYPE } from "@/lib/config/tier1-questions"
import { createReportSession, type ReportSession } from "@/lib/config/report-session"
import type { Question } from "@/lib/types"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"
import type { PendingQuestion } from "@/lib/agents/expert_investigator/session_store"
import type { Tier1Question } from "@/lib/config/tier1-questions"
import { isSubstantiveTier2AnswerText } from "@/lib/report/tier2-stable-board"
import { agentStateFromIncidentSnapshot } from "@/lib/report/agent-state-from-session"
import { reconcileReportPhase } from "@/lib/report/reconcile-report-session"
import {
  computePhase1WorkflowPercent,
  countPhase1WorkflowFromSession,
} from "@/lib/report/phase1-workflow-progress"

const DEFERRED = "__DEFERRED__"
const UNKNOWN = "__UNKNOWN__"

function questionToTier1Board(q: Tier1Question) {
  return {
    id: q.id,
    text: q.text,
    label: q.label,
    areaHint: q.areaHint,
    tier: "tier1" as const,
    allowDefer: q.allowDefer,
    required: q.required,
  }
}

function questionToTier2Board(q: PendingQuestion) {
  return {
    id: q.id,
    text: q.text,
    label: "Tier 2",
    areaHint: "Follow-up",
    tier: "tier2" as const,
    allowDefer: true,
    required: false,
  }
}

function questionToClosingBoard(q: Tier1Question) {
  return {
    id: q.id,
    text: q.text,
    label: q.label,
    areaHint: q.areaHint,
    tier: "closing" as const,
    allowDefer: q.allowDefer,
    required: q.required,
  }
}

export function buildReportSessionFromIncident(
  incident: IncidentDocument,
  user: { userId: string; userName: string; userRole: string },
): ReportSession | null {
  const incidentType = incident.incidentType ?? "fall"
  const tier1Questions = TIER1_BY_TYPE[incidentType]
  if (!tier1Questions) return null

  const tier1Answers: Record<string, string> = {}
  const tier2Answers: Record<string, string> = {}
  const closingAnswers: Record<string, string> = {}
  const tier2DeferredIds: string[] = []
  const tier2UnknownIds: string[] = []
  const tier2Questions: PendingQuestion[] = []

  for (const q of incident.questions ?? []) {
    const group = staffQuestionGroup({
      id: q.id,
      questionText: q.questionText,
      askedBy: q.askedBy,
      askedAt: q.askedAt instanceof Date ? q.askedAt.toISOString() : String(q.askedAt),
      generatedBy: q.generatedBy,
      metadata: q.metadata,
      priority: q.priority,
    } as Question)
    const text = q.answer?.answerText?.trim() ?? ""
    if (group === "tier1") {
      if (text && text !== DEFERRED && text !== UNKNOWN) tier1Answers[q.id] = text
    } else if (group === "tier2") {
      if (text === DEFERRED) tier2DeferredIds.push(q.id)
      else if (text === UNKNOWN) tier2UnknownIds.push(q.id)
      else if (isSubstantiveTier2AnswerText(text)) tier2Answers[q.id] = text

      // Live board: unanswered + deferred only (answered cards are removed per phase 11d).
      if (!isSubstantiveTier2AnswerText(text)) {
        tier2Questions.push({
          id: q.id,
          text: q.questionText,
          askedAt:
            q.askedAt instanceof Date ? q.askedAt.toISOString() : new Date().toISOString(),
        })
      }
    } else if (group === "closing") {
      if (text && text !== DEFERRED && text !== UNKNOWN) closingAnswers[q.id] = text
    }
  }

  const allTier1Answered = tier1Questions.every((q) => (tier1Answers[q.id]?.trim().length ?? 0) > 0)

  const sessionId = uuidv4()
  const now = new Date().toISOString()

  const session: ReportSession = {
    sessionId,
    incidentId: incident.id,
    facilityId: incident.facilityId ?? "",
    userId: user.userId,
    userName: user.userName,
    userRole: user.userRole,
    incidentType,
    residentId: incident.residentId ?? "",
    residentName: incident.residentName,
    residentRoom: incident.residentRoom,
    location: incident.location ?? "",
    hasInjury: incident.hasInjury ?? null,
    reportPhase: "tier1",
    tier1Questions,
    tier1Answers,
    tier1CompletedAt: allTier1Answered ? now : null,
    fullNarrative: incident.initialReport?.narrative?.trim() ?? "",
    agentState: null, // hydrated below after session shell is built
    tier2Questions,
    tier2Answers,
    tier2DeferredIds,
    tier2UnknownIds,
    closingQuestions: CLOSING_QUESTIONS,
    closingAnswers,
    activeDataCollectionMs: (incident.activeDataCollectionSeconds ?? 0) * 1000,
    dataPointsPerQuestion: (incident.dataPointsPerQuestion ?? []).map((row) => ({
      questionId: row.questionId,
      questionText: "",
      dataPointsCovered: row.dataPointsCovered,
      fieldsCovered: [],
    })),
    completenessScore: incident.completenessScore ?? 0,
    completenessAtTier1: incident.completenessAtTier1Complete ?? 0,
    tier2QuestionsGenerated: incident.tier2QuestionsGenerated ?? tier2Questions.length,
    startedAt: incident.createdAt instanceof Date ? incident.createdAt.toISOString() : now,
    lastActivityAt: now,
  }

  session.reportPhase = reconcileReportPhase(session)
  session.agentState = agentStateFromIncidentSnapshot(incident.activeReportAgentState, session)
  return session
}

export async function recreateReportSessionFromIncident(
  incident: IncidentDocument,
  user: { userId: string; userName: string; userRole: string },
): Promise<ReportSession | null> {
  const session = buildReportSessionFromIncident(incident, user)
  if (!session) return null
  await createReportSession(session)
  return session
}

export function reportSessionToResumePayload(session: ReportSession, warning?: string) {
  const answeredIds = [
    ...Object.keys(session.tier1Answers).filter((id) => session.tier1Answers[id]?.trim()),
    ...Object.keys(session.tier2Answers).filter((id) => session.tier2Answers[id]?.trim()),
    ...Object.keys(session.closingAnswers).filter((id) => session.closingAnswers[id]?.trim()),
  ]

  const answers: Record<string, string> = {
    ...session.tier1Answers,
    ...session.tier2Answers,
    ...session.closingAnswers,
  }
  for (const id of session.tier2DeferredIds) {
    answers[id] = DEFERRED
  }
  for (const id of session.tier2UnknownIds) {
    answers[id] = UNKNOWN
  }

  const workflowCounts = countPhase1WorkflowFromSession(session)
  const workflowProgressPercent = computePhase1WorkflowPercent(workflowCounts, "phase_1_in_progress")

  return {
    status: "session_active" as const,
    sessionId: session.sessionId,
    incidentId: session.incidentId,
    residentName: session.residentName,
    residentRoom: session.residentRoom,
    incidentType: session.incidentType,
    reportPhase: session.reportPhase,
    tier1Questions: session.tier1Questions.map(questionToTier1Board),
    tier2Questions: session.tier2Questions.map(questionToTier2Board),
    closingQuestions: session.closingQuestions.map(questionToClosingBoard),
    answeredIds,
    answers,
    completenessScore: session.completenessScore,
    workflowProgressPercent,
    ...(warning ? { warning } : {}),
  }
}
