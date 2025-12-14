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
  question: string
  askedBy: string
  askedByName?: string
  askedAt: string
  assignedTo?: string[]
  answer?: {
    text: string
    answeredBy: string
    answeredAt: string
    method?: "text" | "voice"
  }
  source?: "ai-generated" | "manual"
  generatedBy?: string
}

export interface InitialReport {
  narrative: string // Raw voice transcript
  enhancedNarrative: string // AI-polished version
  residentState?: string // Raw voice transcript
  enhancedResidentState?: string // AI-polished version
  environmentNotes?: string // Raw voice transcript
  enhancedEnvironmentNotes?: string // AI-polished version
  createdBy: string
  createdByName: string
  createdAt: string
  method: "voice" | "text"
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
  initialReport?: InitialReport
  humanReport?: HumanReport
  aiReport?: AIReport
}

export interface Database {
  users: User[]
  incidents: Incident[]
  notifications: IncidentNotification[]
}
