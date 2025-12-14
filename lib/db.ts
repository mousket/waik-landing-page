import bcrypt from "bcryptjs"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import UserModel from "@/backend/src/models/user.model"
import NotificationModel from "@/backend/src/models/notification.model"
import type {
  Answer,
  Incident,
  IncidentInitialReport,
  IncidentInvestigationMetadata,
  IncidentNotification,
  InvestigationStatus,
  Question,
  User,
  UserRole,
} from "./types"
import { getQuestionEmbedding } from "./embeddings"
import { isOpenAIConfigured } from "./openai"

let isInitialized = false

async function ensureDatabase() {
  await connectMongo()
  if (!isInitialized) {
    isInitialized = true
  }
}

const toIsoString = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

const serializeAnswer = (answer?: any): Answer | undefined => {
  if (!answer) return undefined
  return {
    id: answer.id,
    questionId: answer.questionId,
    answerText: answer.answerText,
    answeredBy: answer.answeredBy,
    answeredAt: toIsoString(answer.answeredAt) ?? new Date().toISOString(),
    method: answer.method,
  }
}

const serializeQuestion = (question: any): Question => ({
  id: question.id,
  incidentId: question.incidentId,
  questionText: question.questionText,
  askedBy: question.askedBy,
  askedByName: question.askedByName,
  askedAt: toIsoString(question.askedAt) ?? new Date().toISOString(),
  assignedTo: question.assignedTo?.length ? question.assignedTo : undefined,
  answer: serializeAnswer(question.answer),
  source: question.source,
  generatedBy: question.generatedBy,
  vectorizedAt: toIsoString(question.vectorizedAt),
  metadata: question.metadata,
})

const serializeIncident = (incident: any): Incident => ({
  id: incident.id,
  title: incident.title,
  description: incident.description,
  status: incident.status,
  priority: incident.priority,
  staffId: incident.staffId,
  staffName: incident.staffName,
  residentName: incident.residentName,
  residentRoom: incident.residentRoom,
  createdAt: toIsoString(incident.createdAt) ?? new Date().toISOString(),
  updatedAt: toIsoString(incident.updatedAt) ?? new Date().toISOString(),
  summary: incident.summary ?? null,
  questions: (incident.questions ?? []).map(serializeQuestion),
  initialReport: incident.initialReport
    ? {
        capturedAt: toIsoString(incident.initialReport.capturedAt) ?? new Date().toISOString(),
        narrative: incident.initialReport.narrative,
        residentState: incident.initialReport.residentState,
        environmentNotes: incident.initialReport.environmentNotes,
        enhancedNarrative: incident.initialReport.enhancedNarrative,
        recordedById: incident.initialReport.recordedById,
        recordedByName: incident.initialReport.recordedByName,
        recordedByRole: incident.initialReport.recordedByRole,
      }
    : undefined,
  investigation: incident.investigation
    ? {
        ...incident.investigation,
        startedAt: toIsoString(incident.investigation.startedAt),
        completedAt: toIsoString(incident.investigation.completedAt),
      }
    : undefined,
  humanReport: incident.humanReport
    ? {
        ...incident.humanReport,
        createdAt: toIsoString(incident.humanReport.createdAt) ?? new Date().toISOString(),
        lastEditedAt: toIsoString(incident.humanReport.lastEditedAt),
      }
    : undefined,
  aiReport: incident.aiReport
    ? {
        ...incident.aiReport,
        generatedAt: toIsoString(incident.aiReport.generatedAt) ?? new Date().toISOString(),
      }
    : undefined,
})

const serializeUser = (user: any): User => ({
  id: user.id,
  username: user.username,
  password: user.password,
  role: user.role,
  name: user.name,
  email: user.email,
  createdAt: toIsoString(user.createdAt) ?? new Date().toISOString(),
})

const serializeNotification = (notification: any): IncidentNotification => ({
  id: notification.id,
  incidentId: notification.incidentId,
  type: notification.type,
  message: notification.message,
  createdAt: toIsoString(notification.createdAt) ?? new Date().toISOString(),
  readAt: toIsoString(notification.readAt),
  targetUserId: notification.targetUserId,
})

const VOICE_SEED_QUESTIONS: Array<{ key: keyof IncidentInitialReport; prompt: string }> = [
  { key: "narrative", prompt: "Describe what happened during the incident." },
  { key: "residentState", prompt: "How is the resident doing right now?" },
  { key: "environmentNotes", prompt: "Describe the room or environment conditions." },
]

const toDateOrUndefined = (value?: string | null): Date | undefined => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

const prepareHumanReport = (report?: Incident["humanReport"]) =>
  report
    ? {
        ...report,
        createdAt: toDateOrUndefined(report.createdAt) ?? new Date(),
        lastEditedAt: toDateOrUndefined(report.lastEditedAt) ?? undefined,
      }
    : undefined

const prepareAIReport = (report?: Incident["aiReport"]) =>
  report
    ? {
        ...report,
        generatedAt: toDateOrUndefined(report.generatedAt) ?? new Date(),
      }
    : undefined

const prepareInvestigation = (investigation?: IncidentInvestigationMetadata) =>
  investigation
    ? {
        ...investigation,
        startedAt: toDateOrUndefined(investigation.startedAt) ?? undefined,
        completedAt: toDateOrUndefined(investigation.completedAt) ?? undefined,
      }
    : undefined

export async function getUsers(): Promise<User[]> {
  await ensureDatabase()
  const users = await UserModel.find({}).lean().exec()
  return users.map(serializeUser)
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDatabase()
  const user = await UserModel.findOne({ id }).lean().exec()
  return user ? serializeUser(user) : null
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
  await ensureDatabase()
  const user = await UserModel.findOne({ username }).lean().exec()
  if (!user) return null

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return serializeUser(user)
}

export async function getIncidents(): Promise<Incident[]> {
  await ensureDatabase()
  const incidents = await IncidentModel.find({}).lean().exec()
  return incidents.map(serializeIncident)
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  await ensureDatabase()
  const incident = await IncidentModel.findOne({ id }).lean().exec()
  return incident ? serializeIncident(incident) : null
}

export async function getIncidentsByStaffId(staffId: string): Promise<Incident[]> {
  await ensureDatabase()
  const incidents = await IncidentModel.find({
    $or: [
      { staffId },
      { "questions.assignedTo": staffId },
      { "questions.metadata.assignedStaffIds": staffId },
    ],
  })
    .lean()
    .exec()

  return incidents.map(serializeIncident)
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
  await ensureDatabase()

  const preparedUpdates: any = {
    ...updates,
    updatedAt: new Date(),
  }

  if (updates.humanReport) {
    preparedUpdates.humanReport = prepareHumanReport(updates.humanReport)
  }

  if (updates.aiReport) {
    preparedUpdates.aiReport = prepareAIReport(updates.aiReport)
  }

  if (updates.investigation) {
    preparedUpdates.investigation = prepareInvestigation(updates.investigation)
  }

  if (updates.initialReport) {
    preparedUpdates.initialReport = {
      ...updates.initialReport,
      capturedAt: toDateOrUndefined(updates.initialReport.capturedAt) ?? new Date(),
    }
  }

  if (updates.summary === null) {
    preparedUpdates.summary = null
  }

  const incident = await IncidentModel.findOneAndUpdate({ id }, preparedUpdates, {
    new: true,
    lean: true,
  })

  return incident ? serializeIncident(incident) : null
}

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
    answer?: Answer
  },
): Promise<Question | null> {
  await ensureDatabase()

  const now = new Date()
  const questionId = `q-${Date.now()}`

  const questionDoc = {
    id: questionId,
    incidentId,
    questionText: input.questionText,
    askedBy: input.askedBy,
    askedByName: input.askedByName,
    askedAt: now,
    assignedTo: input.assignedTo,
    metadata: input.metadata,
    source: input.source ?? "manual",
    generatedBy: input.generatedBy,
    answer: input.answer
      ? {
          ...input.answer,
          answeredAt: toDateOrUndefined(input.answer.answeredAt) ?? now,
        }
      : undefined,
  }

  const incident = await IncidentModel.findOneAndUpdate(
    { id: incidentId },
    {
      $push: { questions: questionDoc },
      $set: { updatedAt: now },
    },
    { new: true, lean: true },
  )

  const question = incident?.questions?.find((q: any) => q.id === questionId)
  if (!question) {
    return null
  }

  if (isOpenAIConfigured()) {
    getQuestionEmbedding(
      incidentId,
      question.id,
      question.questionText,
      question.askedBy,
      toIsoString(question.askedAt) ?? now.toISOString(),
      question.answer
        ? {
            id: question.answer.id,
            text: question.answer.answerText,
            answeredBy: question.answer.answeredBy,
            answeredAt: toIsoString(question.answer.answeredAt) ?? now.toISOString(),
          }
        : undefined,
      {
        assignedTo: question.assignedTo,
        reporterId: incident?.staffId,
        reporterName: incident?.staffName,
        reporterRole: incident?.questions?.[0]?.metadata?.reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      },
    ).catch((error) => {
      console.error("[DB] Failed to vectorize question", question.id, error)
    })
  }

  return serializeQuestion(question)
}

export async function answerQuestion(
  incidentId: string,
  questionId: string,
  answer: Answer,
): Promise<Question | null> {
  await ensureDatabase()

  const answeredAt = toDateOrUndefined(answer.answeredAt) ?? new Date()

  const incident = await IncidentModel.findOneAndUpdate(
    { id: incidentId, "questions.id": questionId },
    {
      $set: {
        "questions.$.answer": {
          ...answer,
          answeredAt,
        },
        "questions.$.vectorizedAt": answeredAt,
        updatedAt: new Date(),
      },
    },
    { new: true, lean: true },
  )

  const question = incident?.questions?.find((q: any) => q.id === questionId)
  if (!question) {
    return null
  }

  if (isOpenAIConfigured()) {
    getQuestionEmbedding(
      incidentId,
      questionId,
      question.questionText,
      question.askedBy,
      toIsoString(question.askedAt) ?? answeredAt.toISOString(),
      {
        id: question.answer.id,
        text: question.answer.answerText,
        answeredBy: question.answer.answeredBy,
        answeredAt: toIsoString(question.answer.answeredAt) ?? answeredAt.toISOString(),
      },
      {
        assignedTo: question.assignedTo,
        reporterId: incident?.staffId,
        reporterName: incident?.staffName,
        reporterRole: incident?.questions?.[0]?.metadata?.reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      },
    ).catch((error) => {
      console.error("[DB] Auto-vectorization failed (non-critical):", error)
    })
  }

  return serializeQuestion(question)
}

export async function deleteQuestion(incidentId: string, questionId: string): Promise<boolean> {
  await ensureDatabase()

  const incident = await IncidentModel.findOne({ id: incidentId }).lean().exec()
  if (!incident) {
    return false
  }

  const question = incident.questions?.find((q: any) => q.id === questionId)
  if (!question || question.answer) {
    return false
  }

  const result = await IncidentModel.updateOne(
    { id: incidentId },
    {
      $pull: { questions: { id: questionId } },
      $set: { updatedAt: new Date() },
    },
  )

  return result.modifiedCount > 0
}

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

export async function createIncidentFromReport(input: CreateIncidentFromReportInput): Promise<Incident> {
  await ensureDatabase()

  const now = new Date()
  const incidentId = `inc-${Date.now()}`

  const initialReport: IncidentInitialReport = {
    capturedAt: now.toISOString(),
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

  const seedQuestions = VOICE_SEED_QUESTIONS.flatMap((seed, index) => {
    const value = (initialReport as any)[seed.key]
    if (!value) return []

    const questionId = `q-${Date.now()}-${index}`
    const answerId = `a-${Date.now()}-${index}`

    return [
      {
        id: questionId,
        incidentId,
        questionText: seed.prompt,
        askedBy: input.reportedById,
        askedByName: input.reportedByName,
        askedAt: now,
        source: "voice-report" as Question["source"],
        generatedBy: "reporter-agent",
        metadata: {
          ...baseQuestionProps,
          createdVia: "voice" as const,
        },
        answer: {
          id: answerId,
          questionId,
          answerText: value,
          answeredBy: input.reportedById,
          answeredAt: now,
          method: "voice" as const,
        },
      },
    ]
  })

  const incidentDoc = await IncidentModel.create({
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
    initialReport: {
      ...initialReport,
      capturedAt: now,
    },
    investigation: {
      status: "not-started",
    },
  })

  const incident = serializeIncident(incidentDoc.toJSON())

  if (isOpenAIConfigured()) {
    Promise.all(
      incident.questions.map((question) =>
        getQuestionEmbedding(
          incident.id,
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
            reporterId: incident.staffId,
            reporterName: incident.staffName,
            reporterRole: input.reportedByRole,
            source: question.source,
            generatedBy: question.generatedBy,
          },
        ).catch((error) => {
          console.error("[DB] Failed to vectorize seed question", question.id, error)
        }),
      ),
    ).catch((error) => console.error("[DB] Seed vectorization batch failed", error))
  }

  return incident
}

interface QueueInvestigationQuestionsInput {
  incidentId: string
  questions: Array<{ questionText: string; assignedTo?: string[] }>
  generatedBy?: string
  askedById?: string
  askedByName?: string
}

export async function queueInvestigationQuestions(
  input: QueueInvestigationQuestionsInput,
): Promise<Question[]> {
  await ensureDatabase()

  const incident = await IncidentModel.findOne({ id: input.incidentId }).lean().exec()
  if (!incident) {
    throw new Error(`Incident ${input.incidentId} not found`)
  }

  const reporterRole = incident.investigation?.reporterRole ?? (await getUserById(incident.staffId))?.role ?? "staff"
  const timestamp = new Date()
  const generatedBy = input.generatedBy || "investigation-agent"
  const askedBy = input.askedById || "investigation-agent"

  const newQuestions = input.questions.map((item, index) => {
    const questionId = `q-${Date.now()}-${index}`
    return {
      id: questionId,
      incidentId: incident.id,
      questionText: item.questionText,
      askedBy,
      askedByName: input.askedByName,
      askedAt: timestamp,
      assignedTo: item.assignedTo,
      source: "ai-generated" as const,
      generatedBy,
      metadata: {
        reporterId: incident.staffId,
        reporterName: incident.staffName,
        reporterRole,
        assignedStaffIds: item.assignedTo,
        createdVia: "system" as const,
      },
    }
  })

  await IncidentModel.updateOne(
    { id: input.incidentId },
    {
      $push: { questions: { $each: newQuestions } },
      $set: {
        updatedAt: timestamp,
        investigation: {
          ...(incident.investigation ?? {}),
          status: "in-progress",
          startedAt: incident.investigation?.startedAt ?? timestamp,
        },
      },
    },
  )

  if (isOpenAIConfigured()) {
    Promise.all(
      newQuestions.map((question) =>
        getQuestionEmbedding(
          incident.id,
          question.id,
          question.questionText,
          question.askedBy,
          timestamp.toISOString(),
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

  return newQuestions.map(serializeQuestion)
}

export async function markInvestigationComplete(
  incidentId: string,
  updates: Partial<Omit<IncidentInvestigationMetadata, "status">> = {},
): Promise<Incident | null> {
  await ensureDatabase()

  const incident = await IncidentModel.findOneAndUpdate(
    { id: incidentId },
    {
      $set: {
        investigation: {
          ...(updates ?? {}),
          status: "completed" as InvestigationStatus,
          completedAt: toDateOrUndefined(updates.completedAt) ?? new Date(),
        },
        updatedAt: new Date(),
      },
    },
    { new: true, lean: true },
  )

  return incident ? serializeIncident(incident) : null
}

type CreateNotificationInput = Omit<IncidentNotification, "id" | "createdAt" | "readAt"> & { id?: string }

export async function createNotification(input: CreateNotificationInput): Promise<IncidentNotification> {
  await ensureDatabase()

  const notification = await NotificationModel.create({
    id: input.id || `notif-${Date.now()}`,
    incidentId: input.incidentId,
    type: input.type,
    message: input.message,
    createdAt: new Date(),
    targetUserId: input.targetUserId,
  })

  return serializeNotification(notification.toJSON())
}

export async function getNotificationsForUser(userId: string): Promise<IncidentNotification[]> {
  await ensureDatabase()
  const notifications = await NotificationModel.find({ targetUserId: userId }).lean().exec()
  return notifications.map(serializeNotification)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await ensureDatabase()
  await NotificationModel.updateOne({ id: notificationId }, { $set: { readAt: new Date() } })
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function isDatabaseInitialized(): boolean {
  return isInitialized
}
