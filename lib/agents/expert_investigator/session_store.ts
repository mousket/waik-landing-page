import type { AgentState } from "@/lib/gold_standards"
import type { MissingFieldDescriptor } from "./gap_questions"

export interface InvestigatorSession {
  id: string
  incidentId: string
  facilityId: string
  investigatorId: string
  investigatorName: string
  nurseName: string
  state: AgentState
  score: number
  completenessScore: number
  feedback: string
  baseScore: number
  baseCompletenessScore: number
  baseFeedback: string
  baseStrengths: string[]
  baseGaps: string[]
  pendingQuestions: PendingQuestion[]
  missingFields: MissingFieldDescriptor[]
  askedQuestionIds: string[]
  askedQuestions: string[]
  answersGiven: number
  createdAt: number
  updatedAt: number
}

export interface PendingQuestion {
  id: string
  text: string
  askedBy?: string
  assignedTo?: string[]
  askedAt?: string
}

const sessions = new Map<string, InvestigatorSession>()

export function createSession(session: InvestigatorSession) {
  sessions.set(session.id, session)
}

export function getSession(sessionId: string): InvestigatorSession | undefined {
  const existing = sessions.get(sessionId)
  if (existing) {
    existing.updatedAt = Date.now()
  }
  return existing
}

export function updateSession(sessionId: string, updater: (session: InvestigatorSession) => InvestigatorSession) {
  const existing = sessions.get(sessionId)
  if (!existing) return
  const updated = updater(existing)
  updated.updatedAt = Date.now()
  sessions.set(sessionId, updated)
}

export function deleteSession(sessionId: string) {
  sessions.delete(sessionId)
}

export function listSessions(): InvestigatorSession[] {
  return Array.from(sessions.values())
}

