import { Schema, model, models, type Document } from "mongoose"
import { QuestionSchema, type QuestionDocument } from "./question.model"

// --- 1. NEW: Reusable Signature Schema (DocuSign-Lite) ---
// Used for Nurse (Phase 1) and Admin/DON (Phase 2)
interface Signature {
  signedBy: string      // User ID
  signedByName: string  // Display Name
  signedAt: Date
  role: string          // "reporter", "don", "admin"
  ipAddress?: string    // For audit trail
  declaration: string   // "I certify this report is accurate..."
}

const SignatureSchema = new Schema<Signature>({
  signedBy: { type: String, required: true },
  signedByName: { type: String, required: true },
  signedAt: { type: Date, required: true },
  role: { type: String, required: true },
  ipAddress: { type: String },
  declaration: { type: String, required: true }
}, { _id: false })

// --- Existing Interfaces (Kept for compatibility) ---
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

// --- 2. UPDATED: Phase 1 Report Interface ---
interface IncidentInitialReport {
  capturedAt: Date
  narrative: string
  residentState?: string
  environmentNotes?: string
  enhancedNarrative?: string
  recordedById: string
  recordedByName: string
  recordedByRole: "staff" | "admin"
  
  // NEW: Phase 1 Critical Data
  immediateIntervention?: {
    action: string         // e.g. "Lowered bed to lowest position"
    timestamp: Date
  }
  witnesses?: Array<{
    type: "staff" | "resident" | "visitor"
    name: string
    userId?: string        // If staff, link to User
    statement?: string     // If resident/visitor, recorded text
    statementAudioUrl?: string
  }>
  signature?: Signature    // The Nurse's Sign-off
}

// --- 3. UPDATED: Phase 2 Investigation Interface ---
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

  // NEW: IDT & Regulatory Data
  idtTeam?: Array<{
    role: "dietary" | "therapy" | "activities" | "nursing" | "admin"
    userId?: string
    status: "pending" | "completed"
    assignedQuestions?: string[]
    completedAt?: Date
  }>
  contributingFactors?: string[] // e.g. ["UTI", "Medication Change"]
  rootCause?: string             // The primary cause chosen by Admin
  permanentIntervention?: {
    carePlanUpdate: string       // e.g. "Add toileting schedule"
    ehrSyncStatus: "pending" | "synced"
  }
  signatures?: {
    don?: Signature              // Director of Nursing Sign-off
    admin?: Signature            // Administrator Sign-off
  }
}

// --- 4. UPDATED: Main Document Interface ---
export interface IncidentDocument extends Document {
  id: string
  companyId?: string
  facilityId?: string // NEW: Multi-tenant Facility Link
  subType?: string
  title: string
  description: string
  
  // NEW: The Regulatory State Machine
  phase: "phase_1_immediate" | "phase_2_investigation" | "closed"
  
  // NEW: The "Red Alert" 2-Hour Rule Engine
  redFlags?: {
    hasInjury: boolean          // Triggers 2hr countdown
    carePlanViolated: boolean   // Triggers 2hr countdown (Neglect)
    stateReportDueAt?: Date     // createdAt + 2 hours
    stateReportFiledAt?: Date
    notificationSentToAdmin: boolean
  }

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

// --- SCHEMAS ---

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
    
    // NEW Phase 1 Fields
    immediateIntervention: {
      action: { type: String },
      timestamp: { type: Date }
    },
    witnesses: [{
      type: { type: String, enum: ["staff", "resident", "visitor"] },
      name: { type: String },
      userId: { type: String },
      statement: { type: String },
      statementAudioUrl: { type: String }
    }],
    signature: { type: SignatureSchema }
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

    // NEW Phase 2 Fields
    idtTeam: [{
      role: { type: String, enum: ["dietary", "therapy", "activities", "nursing", "admin"] },
      userId: { type: String },
      status: { type: String, enum: ["pending", "completed"], default: "pending" },
      assignedQuestions: [{ type: String }],
      completedAt: { type: Date }
    }],
    contributingFactors: [{ type: String }],
    rootCause: { type: String },
    permanentIntervention: {
      carePlanUpdate: { type: String },
      ehrSyncStatus: { type: String, enum: ["pending", "synced"], default: "pending" }
    },
    signatures: {
      don: { type: SignatureSchema },
      admin: { type: SignatureSchema }
    }
  },
  { _id: false },
)

const IncidentSchema = new Schema<IncidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, index: true },
    facilityId: { type: String, index: true }, // New Facility Link
    title: { type: String, required: true },
    subType: { type: String },
    description: { type: String, required: true },
    
    // NEW State Machine
    phase: { 
      type: String, 
      enum: ["phase_1_immediate", "phase_2_investigation", "closed"], 
      default: "phase_1_immediate",
      index: true
    },
    
    // NEW Red Alert Logic
    redFlags: {
      hasInjury: { type: Boolean, default: false },
      carePlanViolated: { type: Boolean, default: false },
      stateReportDueAt: { type: Date },
      stateReportFiledAt: { type: Date },
      notificationSentToAdmin: { type: Boolean, default: false }
    },

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