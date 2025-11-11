import type {
  Answer,
  Database,
  Incident,
  IncidentInitialReport,
  IncidentInvestigationMetadata,
  IncidentNotification,
  InvestigationStatus,
  Question,
  User,
  UserRole,
} from "./types"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import path from "path"
import bcrypt from "bcryptjs"
import { getQuestionEmbedding } from "./embeddings"
import { isOpenAIConfigured } from "./openai"

// Initialize lowdb with JSON file adapter
const dbPath = path.join(process.cwd(), "data", "db.json")
const adapter = new JSONFile<Database>(dbPath)
const db = new Low<Database>(adapter, { users: [], incidents: [], notifications: [] })

// Initialize database - must be called before using
let isInitialized = false

async function initializeDb() {
  if (!isInitialized) {
    await db.read()
    
    // If database is empty, initialize with empty arrays
    db.data ||= { users: [], incidents: [], notifications: [] }
    db.data.notifications ||= []
    
    isInitialized = true
    console.log("[DB] Database initialized from:", dbPath)
  }
}

// Auto-initialize on import (for Next.js API routes)
initializeDb().catch((err) => console.error("[DB] Initialization error:", err))

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export function getDb(): Database {
  return db.data
}

export async function getUsers(): Promise<User[]> {
  await initializeDb()
  await db.read()
  return db.data.users
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
  await initializeDb()
  
  const user = db.data.users.find((u) => u.username === username)
  if (!user) return null

  // Compare password with hashed password
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return user
}

export async function getUserById(id: string): Promise<User | null> {
  await initializeDb()
  await db.read()
  return db.data.users.find((u) => u.id === id) || null
}

// ============================================================================
// INCIDENT FUNCTIONS
// ============================================================================

export async function getIncidents(): Promise<Incident[]> {
  await initializeDb()
  // Always re-read from disk to get latest data
  await db.read()
  return db.data.incidents
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  await initializeDb()
  // Always re-read from disk to get latest data
  await db.read()
  console.log("[DB] Re-read database for incident:", id)
  return db.data.incidents.find((i) => i.id === id) || null
}

export async function getIncidentsByStaffId(staffId: string): Promise<Incident[]> {
  await initializeDb()
  await db.read()

  return db.data.incidents.filter((incident) => {
    const isReporter = incident.staffId === staffId
    const isAssigned = incident.questions.some((q) => q.assignedTo?.includes(staffId))
    const hasDirectedQuestion = incident.questions.some((q) => q.metadata?.assignedStaffIds?.includes(staffId))

    return isReporter || isAssigned || hasDirectedQuestion
  })
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
  await initializeDb()
  
  const index = db.data.incidents.findIndex((i) => i.id === id)
  if (index === -1) return null

  db.data.incidents[index] = {
    ...db.data.incidents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await db.write()
  return db.data.incidents[index]
}

export async function addIncident(incident: Incident): Promise<Incident> {
  await initializeDb()
  await db.read()
  
  db.data.incidents.push(incident)
  await db.write()
  
  return incident
}

// ============================================================================
// QUESTION & ANSWER FUNCTIONS
// ============================================================================

export async function addQuestionToIncident(
  incidentId: string,
  input: {
    questionText: string
    askedBy: string
    askedByName?: string
    assignedTo?: string[]
    metadata?: Question["metadata"]
    source?: Question["source"]
    generatedBy?: string
  },
): Promise<Question | null> {
  await initializeDb()

  const incident = db.data.incidents.find((i) => i.id === incidentId)
  if (!incident) {
    console.error(`[DB] Incident ${incidentId} not found when adding question`)
    return null
  }

  const timestamp = new Date().toISOString()
  const question: Question = {
    id: `q-${Date.now()}`,
    incidentId,
    questionText: input.questionText,
    askedBy: input.askedBy,
    askedByName: input.askedByName,
    askedAt: timestamp,
    assignedTo: input.assignedTo,
    metadata: input.metadata,
    source: input.source ?? "manual",
    generatedBy: input.generatedBy,
  }

  incident.questions.push(question)
  incident.updatedAt = timestamp
  await db.write()

  if (isOpenAIConfigured()) {
    getQuestionEmbedding(
      incidentId,
      question.id,
      question.questionText,
      question.askedBy,
      question.askedAt,
      undefined,
      question.metadata,
    )
      .then(() => {
        question.vectorizedAt = new Date().toISOString()
      })
      .catch((error) => {
        console.error("[DB] Failed to vectorize question", question.id, error)
      })
  }

  return question
}

export async function answerQuestion(
  incidentId: string,
  questionId: string,
  answer: Answer,
): Promise<Question | null> {
  await initializeDb()
  await db.read()

  const incident = db.data.incidents.find((i) => i.id === incidentId)
  if (!incident) {
    console.log("[DB] Incident not found:", incidentId)
    return null
  }

  const question = incident.questions.find((q) => q.id === questionId)
  if (!question) {
    console.log("[DB] Question not found:", questionId, "in incident:", incidentId)
    return null
  }

  question.answer = answer
  incident.updatedAt = new Date().toISOString()
  
  await db.write()

  if (isOpenAIConfigured()) {
    const reporterRole = db.data.users.find((u) => u.id === incident.staffId)?.role || "staff"
    getQuestionEmbedding(
      incidentId,
      questionId,
      question.questionText,
      question.askedBy,
      question.askedAt,
      {
        id: answer.id,
        text: answer.answerText,
        answeredBy: answer.answeredBy,
        answeredAt: answer.answeredAt,
      },
      {
        assignedTo: question.assignedTo,
        reporterId: incident.staffId,
        reporterName: incident.staffName,
        reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      },
    )
      .then(() => {
        console.log("[DB] Vectorized answered question", questionId)
      })
      .catch((error) => {
        console.error("[DB] Auto-vectorization failed (non-critical):", error)
      })
  }

  console.log("[DB] Answered question:", questionId, "in incident:", incidentId)
  return question
}

export async function deleteQuestion(incidentId: string, questionId: string): Promise<boolean> {
  await initializeDb()

  const incident = await getIncidentById(incidentId)  // ✅ Now async
  if (!incident) {
    console.log("[DB] Incident not found:", incidentId)
    return false
  }

  const questionIndex = incident.questions.findIndex((q) => q.id === questionId)
  if (questionIndex === -1) {
    console.log("[DB] Question not found:", questionId)
    return false
  }

  // Only allow deleting unanswered questions
  if (incident.questions[questionIndex].answer) {
    console.log("[DB] Cannot delete answered question:", questionId)
    return false
  }

  incident.questions.splice(questionIndex, 1)
  incident.updatedAt = new Date().toISOString()
  
  await db.write()
  console.log("[DB] Deleted question:", questionId, "from incident:", incidentId)
  return true
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Force a read from disk (useful for debugging)
 */
export async function refreshDb(): Promise<void> {
  await db.read()
  console.log("[DB] Database refreshed from disk")
}

/**
 * Get database file path
 */
export function getDbPath(): string {
  return dbPath
}

/**
 * Create a new incident with questions and answers (e.g. from voice report)
 */
// ============================================================================
// INCIDENT CREATION & INVESTIGATION HELPERS
// ============================================================================

interface CreateIncidentFromReportInput {
  title?: string
  narrative: string
  residentName: string
  residentRoom: string
  residentState?: string
  environmentNotes?: string
  reportedById: string
  reportedByName: string
  reportedByRole: UserRole
  priority?: "low" | "medium" | "high" | "urgent"
  enhancedNarrative?: string
}

const VOICE_SEED_QUESTIONS: Array<{ key: keyof IncidentInitialReport; prompt: string }> = [
  { key: "narrative", prompt: "Describe what happened during the incident." },
  { key: "residentState", prompt: "How is the resident doing right now?" },
  { key: "environmentNotes", prompt: "Describe the room or environment conditions." },
]

/**
 * Create an incident from the voice-guided reporter agent payload.
 * Seeds the Q&A tab with answered questions so admins immediately see context.
 */
export async function createIncidentFromReport(input: CreateIncidentFromReportInput): Promise<Incident> {
  await initializeDb()
  await db.read()

  const now = new Date().toISOString()
  const incidentId = `inc-${Date.now()}`

  const initialReport: IncidentInitialReport = {
    capturedAt: now,
    narrative: input.narrative,
    residentState: input.residentState,
    environmentNotes: input.environmentNotes,
    enhancedNarrative: input.enhancedNarrative,
    recordedById: input.reportedById,
    recordedByName: input.reportedByName,
    recordedByRole: input.reportedByRole,
  }

  const baseQuestionProps = {
    reporterId: input.reportedById,
    reporterName: input.reportedByName,
    reporterRole: input.reportedByRole,
  }

  const seedQuestions: Question[] = VOICE_SEED_QUESTIONS.flatMap((seed, index) => {
    const value = initialReport[seed.key]
    if (!value) return []

    const questionId = `q-${Date.now()}-${index}`
    const answerId = `a-${Date.now()}-${index}`

    const question: Question = {
      id: questionId,
      incidentId,
      questionText: seed.prompt,
      askedBy: input.reportedById,
      askedByName: input.reportedByName,
      askedAt: now,
      source: "voice-report",
      generatedBy: "reporter-agent",
      metadata: {
        ...baseQuestionProps,
        createdVia: "voice",
      },
      answer: {
        id: answerId,
        questionId,
        answerText: value,
        answeredBy: input.reportedById,
        answeredAt: now,
        method: "voice",
      },
    }

    return [question]
  })

  const incident: Incident = {
    id: incidentId,
    title: input.title || `${input.residentName} Incident`,
    description: input.narrative || "Incident reported via voice agent.",
    status: "open",
    priority: input.priority || "medium",
    staffId: input.reportedById,
    staffName: input.reportedByName,
    residentName: input.residentName,
    residentRoom: input.residentRoom,
    createdAt: now,
    updatedAt: now,
    questions: seedQuestions,
    initialReport,
    investigation: {
      status: "not-started",
    },
  }

  db.data.incidents.push(incident)
  await db.write()

  if (isOpenAIConfigured()) {
    Promise.all(
      seedQuestions.map((question) =>
        getQuestionEmbedding(
          incidentId,
          question.id,
          question.questionText,
          question.askedBy,
          question.askedAt,
          question.answer
            ? {
                id: question.answer.id,
                text: question.answer.answerText,
                answeredBy: question.answer.answeredBy,
                answeredAt: question.answer.answeredAt,
              }
            : undefined,
          {
            assignedTo: question.assignedTo,
            reporterId: input.reportedById,
            reporterName: input.reportedByName,
            reporterRole: input.reportedByRole,
            source: question.source,
            generatedBy: question.generatedBy,
          },
        )
          .then(() => {
            question.vectorizedAt = new Date().toISOString()
          })
          .catch((error) => {
            console.error("[DB] Failed to vectorize seed question", question.id, error)
          }),
      ),
    ).catch((error) => console.error("[DB] Seed vectorization batch failed", error))
  }

  console.log("[DB] Created incident from report:", incident.id)
  return incident
}

interface QueueInvestigationQuestionsInput {
  incidentId: string
  questions: Array<{ questionText: string; assignedTo?: string[] }>
  generatedBy?: string
  askedById?: string
  askedByName?: string
}

/**
 * Queue investigator follow-up questions and vectorize them for downstream RAG.
 */
export async function queueInvestigationQuestions(
  input: QueueInvestigationQuestionsInput,
): Promise<Question[]> {
  await initializeDb()
  await db.read()

  const incident = db.data.incidents.find((i) => i.id === input.incidentId)
  if (!incident) {
    throw new Error(`Incident ${input.incidentId} not found`)
  }

  const reporterRole = db.data.users.find((user) => user.id === incident.staffId)?.role || "staff"
  const timestamp = new Date().toISOString()
  const generatedBy = input.generatedBy || "investigation-agent"
  const askedBy = input.askedById || "investigation-agent"

  const newQuestions: Question[] = input.questions.map((item, index) => {
    const questionId = `q-${Date.now()}-${index}`

    return {
      id: questionId,
      incidentId: incident.id,
      questionText: item.questionText,
      askedBy,
      askedByName: input.askedByName,
      askedAt: timestamp,
      assignedTo: item.assignedTo,
      source: "ai-generated",
      generatedBy,
      metadata: {
        reporterId: incident.staffId,
        reporterName: incident.staffName,
        reporterRole,
        assignedStaffIds: item.assignedTo,
        createdVia: "system",
      },
    }
  })

  incident.questions.push(...newQuestions)
  incident.updatedAt = timestamp
  incident.investigation = incident.investigation || { status: "in-progress" }
  incident.investigation.status = "in-progress"
  incident.investigation.startedAt ||= timestamp

  await db.write()

  if (isOpenAIConfigured()) {
    Promise.all(
      newQuestions.map((question) =>
        getQuestionEmbedding(
          incident.id,
          question.id,
          question.questionText,
          question.askedBy,
          question.askedAt,
          undefined,
          {
            assignedTo: question.assignedTo,
            reporterId: incident.staffId,
            reporterName: incident.staffName,
            reporterRole,
            source: question.source,
            generatedBy: question.generatedBy,
          },
        )
          .then(() => {
            question.vectorizedAt = new Date().toISOString()
          })
          .catch((error) => console.error("[DB] Failed to vectorize queued question", question.id, error)),
      ),
    ).catch((error) => console.error("[DB] Queue vectorization batch failed", error))
  }

  return newQuestions
}

/**
 * Mark an investigation as completed and persist optional metadata.
 */
export async function markInvestigationComplete(
  incidentId: string,
  updates: Partial<Omit<IncidentInvestigationMetadata, "status">> = {},
): Promise<Incident | null> {
  await initializeDb()
  await db.read()

  const incident = db.data.incidents.find((i) => i.id === incidentId)
  if (!incident) {
    return null
  }

  incident.investigation = {
    ...incident.investigation,
    ...updates,
    status: "completed" as InvestigationStatus,
    completedAt: updates.completedAt || new Date().toISOString(),
  }

  incident.updatedAt = new Date().toISOString()
  await db.write()
  return incident
}

// ============================================================================
// NOTIFICATION HELPERS (scaffolding for future prompts)
// ============================================================================

type CreateNotificationInput = Omit<IncidentNotification, "id" | "createdAt" | "readAt"> & { id?: string }

export async function createNotification(input: CreateNotificationInput): Promise<IncidentNotification> {
  await initializeDb()
  await db.read()

  const notification: IncidentNotification = {
    id: input.id || `notif-${Date.now()}`,
    incidentId: input.incidentId,
    type: input.type,
    message: input.message,
    createdAt: new Date().toISOString(),
    targetUserId: input.targetUserId,
    readAt: undefined,
  }

  db.data.notifications.push(notification)
  await db.write()
  return notification
}

export async function getNotificationsForUser(userId: string): Promise<IncidentNotification[]> {
  await initializeDb()
  await db.read()
  return db.data.notifications.filter((notif) => notif.targetUserId === userId)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await initializeDb()
  await db.read()

  const notification = db.data.notifications.find((notif) => notif.id === notificationId)
  if (notification) {
    notification.readAt = new Date().toISOString()
    await db.write()
  }
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized
}
