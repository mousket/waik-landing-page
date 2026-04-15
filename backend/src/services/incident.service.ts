import type { Document } from "mongoose"
import connectMongo from "../lib/mongodb"
import IncidentModel, { type IncidentDocument } from "../models/incident.model"
import type { QuestionDocument, AnswerSubdocument } from "../models/question.model"
import NotificationModel, { type NotificationDocument } from "../models/notification.model"

export interface CreateIncidentInput {
  id?: string
  companyId?: string
  facilityId?: string
  title: string
  description: string
  status?: "open" | "in-progress" | "pending-review" | "closed"
  priority?: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  initialReport?: IncidentDocument["initialReport"]
  humanReport?: IncidentDocument["humanReport"]
  aiReport?: IncidentDocument["aiReport"]
  summary?: string | null
  questions?: Array<Omit<QuestionDocument, keyof Document>>
}

export interface UpdateIncidentInput
  extends Partial<
    Pick<
      IncidentDocument,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "staffName"
      | "residentName"
      | "residentRoom"
      | "summary"
      | "humanReport"
      | "aiReport"
      | "investigation"
    >
  > {}

export interface AddQuestionInput {
  questionText: string
  askedBy: string
  askedByName?: string
  assignedTo?: string[]
  metadata?: QuestionDocument["metadata"]
  source?: QuestionDocument["source"]
  generatedBy?: string
  answer?: AnswerSubdocument
}

export class IncidentService {
  static async getIncidents(companyId?: string, facilityId?: string) {
    await connectMongo()

    const query: Record<string, unknown> = {}
    if (companyId) query.companyId = companyId
    if (facilityId) query.facilityId = facilityId
    return IncidentModel.find(query).lean().exec()
  }

  static async getIncidentById(id: string, facilityId?: string) {
    await connectMongo()
    const q: Record<string, unknown> = { id }
    if (facilityId) q.facilityId = facilityId
    return IncidentModel.findOne(q).lean().exec()
  }

  static async getIncidentsByStaffId(staffId: string, facilityId?: string) {
    await connectMongo()
    const q: Record<string, unknown> = {
      $or: [{ staffId }, { "questions.assignedTo": staffId }],
    }
    if (facilityId) q.facilityId = facilityId
    return IncidentModel.find(q).lean().exec()
  }

  static async createIncident(input: CreateIncidentInput) {
    await connectMongo()

    const incident = await IncidentModel.create({
      ...input,
      id: input.id ?? `inc-${Date.now()}`,
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      questions: (input.questions ?? []) as IncidentDocument["questions"],
    })

    return incident.toJSON()
  }

  static async updateIncident(id: string, updates: UpdateIncidentInput, facilityId?: string) {
    await connectMongo()

    const filter: Record<string, unknown> = { id }
    if (facilityId) filter.facilityId = facilityId

    const incident = await IncidentModel.findOneAndUpdate(
      filter,
      { ...updates, updatedAt: new Date() },
      { new: true },
    )

    return incident?.toJSON() ?? null
  }

  static async addQuestionToIncident(incidentId: string, input: AddQuestionInput, facilityId?: string) {
    await connectMongo()

    const questionId = `q-${Date.now()}`
    const now = new Date()

    const question = {
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
      answer: input.answer,
    }

    const filter: Record<string, unknown> = { id: incidentId }
    if (facilityId) filter.facilityId = facilityId

    const incident = await IncidentModel.findOneAndUpdate(
      filter,
      {
        $push: { questions: question },
        $set: { updatedAt: now },
      },
      { new: true },
    )

    return incident?.questions.find((q: QuestionDocument) => q.id === questionId)?.toJSON?.() ?? question
  }

  static async answerQuestion(
    incidentId: string,
    questionId: string,
    answer: Omit<AnswerSubdocument, "id" | "questionId">,
    facilityId?: string,
  ) {
    await connectMongo()

    const fullAnswer: AnswerSubdocument = {
      id: `a-${Date.now()}`,
      questionId,
      ...answer,
    }

    const filter: Record<string, unknown> = { id: incidentId, "questions.id": questionId }
    if (facilityId) filter.facilityId = facilityId

    const incident = await IncidentModel.findOneAndUpdate(
      filter,
      {
        $set: {
          "questions.$.answer": fullAnswer,
          "questions.$.vectorizedAt": answer.answeredAt,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )

    return incident?.questions.find((q: QuestionDocument) => q.id === questionId)?.answer ?? null
  }

  static async deleteQuestion(incidentId: string, questionId: string, facilityId?: string) {
    await connectMongo()

    const filter: Record<string, unknown> = { id: incidentId }
    if (facilityId) filter.facilityId = facilityId

    const result = await IncidentModel.updateOne(
      filter,
      {
        $pull: { questions: { id: questionId, answer: { $exists: false } } },
        $set: { updatedAt: new Date() },
      },
    )

    return result.modifiedCount > 0
  }

  static async createNotification(
    input: Pick<NotificationDocument, "incidentId" | "type" | "message" | "targetUserId"> & {
      id?: string
      createdAt?: Date
    },
  ) {
    await connectMongo()

    const notification = await NotificationModel.create({
      ...input,
      id: input.id ?? `notif-${Date.now()}`,
      createdAt: input.createdAt ?? new Date(),
    })

    return notification.toJSON()
  }

  static async getNotificationsForUser(userId: string) {
    await connectMongo()
    return NotificationModel.find({ targetUserId: userId }).lean().exec()
  }

  static async markNotificationRead(notificationId: string) {
    await connectMongo()
    await NotificationModel.updateOne({ id: notificationId }, { $set: { readAt: new Date() } })
  }
}

export default IncidentService

