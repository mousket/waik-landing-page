import { Schema, model, models, type Document } from "mongoose"
import { QuestionSchema, type QuestionDocument } from "./question.model"

interface HumanReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  createdBy: string
  createdAt: Date
  lastEditedBy?: string
  lastEditedAt?: Date
}

interface AIReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  generatedAt: Date
  model: string
  confidence: number
  promptTokens?: number
  completionTokens?: number
}

interface IncidentInitialReport {
  capturedAt: Date
  narrative: string
  residentState?: string
  environmentNotes?: string
  enhancedNarrative?: string
  recordedById: string
  recordedByName: string
  recordedByRole: "staff" | "admin"
}

interface IncidentInvestigationMetadata {
  status: "not-started" | "in-progress" | "completed"
  subtype?: string
  startedAt?: Date
  completedAt?: Date
  investigatorId?: string
  investigatorName?: string
  goldStandard?: unknown
  subTypeData?: unknown
  score?: number | null
  completenessScore?: number | null
  feedback?: string | null
}

export interface IncidentDocument extends Document {
  id: string
  companyId?: string
  subType?: string
  title: string
  description: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  createdAt: Date
  updatedAt: Date
  summary?: string | null
  questions: QuestionDocument[]
  initialReport?: IncidentInitialReport
  investigation?: IncidentInvestigationMetadata
  humanReport?: HumanReport
  aiReport?: AIReport
}

const HumanReportSchema = new Schema<HumanReport>(
  {
    summary: { type: String, required: true },
    insights: { type: String, required: true },
    recommendations: { type: String, required: true },
    actions: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, required: true },
    lastEditedBy: { type: String },
    lastEditedAt: { type: Date },
  },
  { _id: false },
)

const AIReportSchema = new Schema<AIReport>(
  {
    summary: { type: String, required: true },
    insights: { type: String, required: true },
    recommendations: { type: String, required: true },
    actions: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    model: { type: String, required: true },
    confidence: { type: Number, required: true },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
  },
  { _id: false },
)

const InitialReportSchema = new Schema<IncidentInitialReport>(
  {
    capturedAt: { type: Date, required: true },
    narrative: { type: String, required: true },
    residentState: { type: String },
    environmentNotes: { type: String },
    enhancedNarrative: { type: String },
    recordedById: { type: String, required: true },
    recordedByName: { type: String, required: true },
    recordedByRole: { type: String, required: true, enum: ["staff", "admin"] },
  },
  { _id: false },
)

const InvestigationSchema = new Schema<IncidentInvestigationMetadata>(
  {
    status: { type: String, required: true, enum: ["not-started", "in-progress", "completed"] },
    subtype: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    investigatorId: { type: String },
    investigatorName: { type: String },
    goldStandard: { type: Schema.Types.Mixed },
    subTypeData: { type: Schema.Types.Mixed },
    score: { type: Number, default: null },
    completenessScore: { type: Number, default: null },
    feedback: { type: String, default: null },
  },
  { _id: false },
)

const IncidentSchema = new Schema<IncidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, index: true },
    title: { type: String, required: true },
    subType: { type: String },
    description: { type: String, required: true },
    status: { type: String, required: true, enum: ["open", "in-progress", "pending-review", "closed"] },
    priority: { type: String, required: true, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    staffId: { type: String, required: true },
    staffName: { type: String, required: true },
    residentName: { type: String, required: true },
    residentRoom: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
    summary: { type: String, default: null },
    questions: { type: [QuestionSchema], default: [] },
    initialReport: { type: InitialReportSchema, default: undefined },
    investigation: { type: InvestigationSchema, default: undefined },
    humanReport: { type: HumanReportSchema, default: undefined },
    aiReport: { type: AIReportSchema, default: undefined },
  },
  {
    versionKey: false,
    timestamps: false,
  },
)

IncidentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const IncidentModel = models.Incident || model<IncidentDocument>("Incident", IncidentSchema)

export default IncidentModel

