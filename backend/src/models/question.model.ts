import { Schema, model, models, type Document } from "mongoose"

export interface AnswerSubdocument {
  id: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredAt: Date
  method: "text" | "voice"
}

export interface QuestionMetadata {
  reporterId?: string
  reporterName?: string
  reporterRole?: "staff" | "admin"
  assignedStaffIds?: string[]
  createdVia?: "voice" | "text" | "system"
}

export interface QuestionDocument extends Document {
  id: string
  incidentId?: string
  questionText: string
  askedBy: string
  askedByName?: string
  askedAt: Date
  assignedTo?: string[]
  answer?: AnswerSubdocument
  source?: "voice-report" | "ai-generated" | "manual"
  generatedBy?: string
  vectorizedAt?: Date
  metadata?: QuestionMetadata
}

export const AnswerSchema = new Schema<AnswerSubdocument>(
  {
    id: { type: String, required: true },
    questionId: { type: String, required: true },
    answerText: { type: String, required: true },
    answeredBy: { type: String, required: true },
    answeredAt: { type: Date, required: true },
    method: { type: String, required: true, enum: ["text", "voice"] },
  },
  { _id: false },
)

export const QuestionSchema = new Schema<QuestionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    incidentId: { type: String, index: true },
    questionText: { type: String, required: true },
    askedBy: { type: String, required: true },
    askedByName: { type: String },
    askedAt: { type: Date, required: true },
    assignedTo: { type: [String], default: undefined },
    answer: { type: AnswerSchema, default: undefined },
    source: { type: String, enum: ["voice-report", "ai-generated", "manual"], default: "manual" },
    generatedBy: { type: String },
    vectorizedAt: { type: Date },
    metadata: {
      reporterId: { type: String },
      reporterName: { type: String },
      reporterRole: { type: String, enum: ["staff", "admin"] },
      assignedStaffIds: { type: [String], default: undefined },
      createdVia: { type: String, enum: ["voice", "text", "system"] },
    },
  },
  { versionKey: false, timestamps: false },
)

QuestionSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const QuestionModel = models.Question || model<QuestionDocument>("Question", QuestionSchema)

export default QuestionModel

