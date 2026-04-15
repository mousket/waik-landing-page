import path from "path"
import fs from "fs/promises"
import dotenv from "dotenv"

import connectMongo from "../src/lib/mongodb"
import UserModel from "../src/models/user.model"
import IncidentModel from "../src/models/incident.model"
import NotificationModel from "../src/models/notification.model"

import type { Database, Incident, Question, Answer, IncidentNotification } from "../../lib/types"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")

dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function mapAnswer(answer?: Answer | null, questionId?: string) {
  if (!answer) return undefined
  return {
    id: answer.id ?? `a-${Date.now()}`,
    questionId: answer.questionId ?? questionId ?? `q-${Date.now()}`,
    answerText: answer.answerText,
    answeredBy: answer.answeredBy,
    answeredAt: parseDate(answer.answeredAt) ?? new Date(),
    method: answer.method,
  }
}

function mapQuestion(question: Question, incidentId: string) {
  return {
    id: question.id,
    incidentId,
    questionText: question.questionText,
    askedBy: question.askedBy,
    askedByName: question.askedByName,
    askedAt: parseDate(question.askedAt) ?? new Date(),
    assignedTo: question.assignedTo && question.assignedTo.length > 0 ? question.assignedTo : undefined,
    answer: mapAnswer(question.answer, question.id),
    source: question.source ?? "manual",
    generatedBy: question.generatedBy,
    vectorizedAt: parseDate(question.vectorizedAt),
    metadata: question.metadata,
  }
}

function mapIncident(incident: Incident) {
  return {
    id: incident.id,
    companyId: (incident as any).companyId,
    subType: (incident as any).sub_type ?? (incident as any).subType,
    title: incident.title,
    description: incident.description,
    status: incident.status,
    priority: incident.priority,
    staffId: incident.staffId,
    staffName: incident.staffName,
    residentName: incident.residentName,
    residentRoom: incident.residentRoom,
    createdAt: parseDate(incident.createdAt) ?? new Date(),
    updatedAt: parseDate(incident.updatedAt) ?? new Date(),
    summary: incident.summary ?? null,
    questions: incident.questions?.map((question) => mapQuestion(question, incident.id)) ?? [],
    initialReport: incident.initialReport
      ? {
          capturedAt: parseDate(incident.initialReport.capturedAt) ?? new Date(),
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
          startedAt: parseDate(incident.investigation.startedAt),
          completedAt: parseDate(incident.investigation.completedAt),
        }
      : undefined,
    humanReport: incident.humanReport
      ? {
          ...incident.humanReport,
          createdAt: parseDate(incident.humanReport.createdAt) ?? new Date(),
          lastEditedAt: parseDate(incident.humanReport.lastEditedAt),
        }
      : undefined,
    aiReport: incident.aiReport
      ? {
          ...incident.aiReport,
          generatedAt: parseDate(incident.aiReport.generatedAt) ?? new Date(),
        }
      : undefined,
  }
}

function mapNotification(notification: IncidentNotification) {
  return {
    id: notification.id,
    incidentId: notification.incidentId,
    type: notification.type,
    message: notification.message,
    createdAt: parseDate(notification.createdAt) ?? new Date(),
    readAt: parseDate(notification.readAt),
    targetUserId: notification.targetUserId,
  }
}

async function migrate() {
  const dbPath = path.resolve(process.cwd(), "data", "db.json")
  const contents = await fs.readFile(dbPath, "utf-8")
  const data = JSON.parse(contents) as Database

  await connectMongo()

  await Promise.all([
    UserModel.deleteMany({}),
    IncidentModel.deleteMany({}),
    NotificationModel.deleteMany({}),
  ])

  const users = data.users.map((user) => ({
    id: user.id,
    username: user.username,
    password: user.password,
    role: user.role,
    name: user.name,
    email: user.email,
    roleSlug: user.role === "admin" ? "administrator" : "cna",
    organizationId: "",
    facilityId: "",
    firstName: "",
    lastName: "",
    isWaikSuperAdmin: false,
    deviceType: "personal" as const,
    mustChangePassword: false,
    isActive: true,
    createdAt: parseDate(user.createdAt) ?? new Date(),
  }))

  await UserModel.insertMany(users)

  const incidents = data.incidents.map(mapIncident)
  await IncidentModel.insertMany(incidents)

  if (Array.isArray(data.notifications) && data.notifications.length > 0) {
    const notifications = data.notifications.map(mapNotification)
    await NotificationModel.insertMany(notifications)
  }

  console.log(`Migrated ${users.length} users, ${incidents.length} incidents${Array.isArray(data.notifications) ? `, ${data.notifications.length} notifications` : ""} to MongoDB.`)
  process.exit(0)
}

migrate().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})

