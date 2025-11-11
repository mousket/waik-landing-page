import type { Document } from "mongoose"
import connectMongo from "../lib/mongodb"
import IncidentModel, { type IncidentDocument } from "../models/incident.model"
import { QuestionSchema, type QuestionDocument, type AnswerSubdocument } from "../models/question.model"
import NotificationModel, { type NotificationDocument } from "../models/notification.model"

export interface CreateIncidentInput {
  id?: string
  companyId?: string
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
  static async getIncidents(companyId?: string) {
    await connectMongo()

    const query = companyId ? { companyId } : {}
    return IncidentModel.find(query).lean().exec()
  }

  static async getIncidentById(id: string) {
    await connectMongo()
    return IncidentModel.findOne({ id }).lean().exec()
  }

  static async getIncidentsByStaffId(staffId: string) {
    await connectMongo()
    return IncidentModel.find({ $or: [{ staffId }, { "questions.assignedTo": staffId }] }).lean().exec()
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
      questions: (input.questions ?? []).map((question) => QuestionSchema.cast(question)),
    })

    return incident.toJSON()
  }

  static async updateIncident(id: string, updates: UpdateIncidentInput) {
    await connectMongo()

    const incident = await IncidentModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true },
    )

    return incident?.toJSON() ?? null
  }

  static async addQuestionToIncident(incidentId: string, input: AddQuestionInput) {
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

    const incident = await IncidentModel.findOneAndUpdate(
      { id: incidentId },
      {
        $push: { questions: question },
        $set: { updatedAt: now },
      },
      { new: true },
    )

    return incident?.questions.find((q) => q.id === questionId)?.toJSON?.() ?? question
  }

  static async answerQuestion(
    incidentId: string,
    questionId: string,
    answer: Omit<AnswerSubdocument, "id" | "questionId">,
  ) {
    await connectMongo()

    const fullAnswer: AnswerSubdocument = {
      id: `a-${Date.now()}`,
      questionId,
      ...answer,
    }

    const incident = await IncidentModel.findOneAndUpdate(
      { id: incidentId, "questions.id": questionId },
      {
        $set: {
          "questions.$.answer": fullAnswer,
          "questions.$.vectorizedAt": answer.answeredAt,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )

    return incident?.questions.find((q) => q.id === questionId)?.answer ?? null
  }

  static async deleteQuestion(incidentId: string, questionId: string) {
    await connectMongo()

    const result = await IncidentModel.updateOne(
      { id: incidentId },
      {
        $pull: { questions: { id: questionId, answer: { $exists: false } } },
        $set: { updatedAt: new Date() },
      },
    )

    return result.modifiedCount > 0
  }

  static async createNotification(input: Omit<NotificationDocument, keyof Document>) {
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

