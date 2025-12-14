export type UserRole = "staff" | "admin"

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  email: string
  createdAt: string
}

export interface Answer {
  id: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredAt: string
  method: "text" | "voice"
}

export interface Question {
  id: string
  incidentId?: string
  questionText: string
  askedBy: string
  askedByName?: string
  askedAt: string
  assignedTo?: string[]
  answer?: Answer
  source?: "voice-report" | "ai-generated" | "manual"
  generatedBy?: string
  vectorizedAt?: string
  metadata?: {
    reporterId?: string
    reporterName?: string
    reporterRole?: UserRole
    assignedStaffIds?: string[]
    createdVia?: "voice" | "text" | "system"
  }
}

export interface IncidentInitialReport {
  capturedAt: string
  narrative: string
  residentState?: string
  environmentNotes?: string
  enhancedNarrative?: string
  recordedById: string
  recordedByName: string
  recordedByRole: UserRole
}

export type InvestigationStatus = "not-started" | "in-progress" | "completed"

import type { GoldStandardFallReport, FallSubtypeStandards } from "./gold_standards"

export interface IncidentInvestigationMetadata {
  status: InvestigationStatus
  subtype?: string
  startedAt?: string
  completedAt?: string
  investigatorId?: string
  investigatorName?: string
  goldStandard?: GoldStandardFallReport | null
  subTypeData?: FallSubtypeStandards | null
  score?: number | null
  completenessScore?: number | null
  feedback?: string | null
}

export interface IncidentNotification {
  id: string
  incidentId: string
  type: "incident-created" | "investigation-started" | "follow-up-required" | "investigation-completed"
  message: string
  createdAt: string
  readAt?: string
  targetUserId: string
}

export interface HumanReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  createdBy: string
  createdAt: string
  lastEditedBy?: string
  lastEditedAt?: string
}

export interface AIReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  generatedAt: string
  model: string
  confidence: number
  promptTokens?: number
  completionTokens?: number
}

export interface Incident {
  id: string
  title: string
  description: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  createdAt: string
  updatedAt: string
  questions: Question[]
  initialReport?: IncidentInitialReport
  investigation?: IncidentInvestigationMetadata
  summary?: string | null
  humanReport?: HumanReport
  aiReport?: AIReport
}

export interface Database {
  users: User[]
  incidents: Incident[]
  notifications: IncidentNotification[]
}
