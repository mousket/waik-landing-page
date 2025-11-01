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
  incidentId: string
  questionText: string
  askedBy: string
  askedAt: string
  assignedTo?: string[]
  answer?: Answer
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
  summary?: string | null
  humanReport?: HumanReport
  aiReport?: AIReport
}

export interface Database {
  users: User[]
  incidents: Incident[]
}
