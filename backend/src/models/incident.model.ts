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
  recordedByRole: string
  
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

  /** Phase-1 sign-off: LLM audit of clinical record vs original narrative (IR-2d). */
  verificationResult?: {
    fidelityScore: number
    overallAssessment: "faithful" | "minor_issues" | "significant_issues"
    additions: string[]
    omissions: string[]
    enhancements: string[]
    verifiedAt: Date
  }
}

const PHASE2_SECTION_STATUS = ["not_started", "in_progress", "complete"] as const
/** Allowed incident workflow phases (task-00j pre-flight; admin/staff dashboards depend on all four). */
export const INCIDENT_PHASES = [
  "phase_1_in_progress",
  "phase_1_complete",
  "phase_2_in_progress",
  "closed",
] as const
const AUDIT_ACTIONS = [
  "locked",
  "unlocked",
  "relocked",
  "phase_transitioned",
  "signed",
  "idt_roster_changed",
] as const
const DEPT_ENUM = ["nursing", "dietary", "therapy", "activities", "administration", "multiple"] as const
const INTERVENTION_DEPT = DEPT_ENUM
const INTERVENTION_KIND = ["temporary", "permanent"] as const

const IdtTeamEntrySchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    questionSent: { type: String },
    questionSentAt: { type: Date },
    response: { type: String },
    respondedAt: { type: Date },
    status: { type: String, enum: ["pending", "answered"], default: "pending" },
  },
  { _id: false },
)

// --- 4. UPDATED: Main Document Interface ---
export interface IncidentDocument extends Document {
  id: string
  companyId?: string
  organizationId?: string
  facilityId?: string
  subType?: string
  title: string
  description: string
  incidentType?: string
  location?: string
  incidentDate?: Date
  incidentTime?: string
  witnessesPresent?: boolean
  hasInjury?: boolean
  injuryDescription?: string
  residentId?: string
  completenessScore?: number
  investigatorId?: string
  investigatorName?: string
  idtTeam?: Array<{
    userId: string
    name: string
    role: string
    questionSent?: string
    questionSentAt?: Date
    response?: string
    respondedAt?: Date
    status?: "pending" | "answered"
  }>

  tier2QuestionsGenerated?: number
  questionsAnswered?: number
  questionsDeferred?: number
  questionsMarkedUnknown?: number
  activeDataCollectionSeconds?: number
  completenessAtTier1Complete?: number
  completenessAtSignoff?: number
  dataPointsPerQuestion?: Array<{ questionId: string; dataPointsCovered: number }>
  phaseTransitionTimestamps?: {
    phase1Started?: Date
    tier1Complete?: Date
    tier2Started?: Date
    phase1Signed?: Date
    phase2Claimed?: Date
    phase2Locked?: Date
  }

  /** De-dupes one-time “all sections complete” notifications (set when first sent). */
  phase2NotificationFlags?: {
    allSectionsCompleteNotifiedAt?: Date
  }

  phase2Sections?: {
    contributingFactors: {
      status: (typeof PHASE2_SECTION_STATUS)[number]
      factors: string[]
      notes?: string
      completedAt?: Date
      completedBy?: string
    }
    rootCause: {
      status: (typeof PHASE2_SECTION_STATUS)[number]
      description?: string
      completedAt?: Date
      completedBy?: string
    }
    interventionReview: {
      status: (typeof PHASE2_SECTION_STATUS)[number]
      reviewedInterventions: Array<{ interventionId: string; stillEffective: boolean; notes?: string }>
      completedAt?: Date
      completedBy?: string
    }
    newIntervention: {
      status: (typeof PHASE2_SECTION_STATUS)[number]
      interventions: Array<{
        description?: string
        department?: (typeof INTERVENTION_DEPT)[number]
        type?: (typeof INTERVENTION_KIND)[number]
        startDate?: Date
        notes?: string
      }>
      completedAt?: Date
      completedBy?: string
    }
  }

  auditTrail?: Array<{
    action: (typeof AUDIT_ACTIONS)[number]
    performedBy: string
    performedByName?: string
    timestamp: Date
    reason?: string
    previousValue?: string
    newValue?: string
  }>
  
  phase: (typeof INCIDENT_PHASES)[number]
  
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

  /** text-embedding-3-small vector (1536 dims); excluded from default queries. */
  embedding?: number[] | null
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
    recordedByRole: { type: String, required: true },
    
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
    },
    verificationResult: {
      fidelityScore: { type: Number, default: null },
      overallAssessment: {
        type: String,
        enum: ["faithful", "minor_issues", "significant_issues"],
        default: null,
      },
      additions: [{ type: String }],
      omissions: [{ type: String }],
      enhancements: [{ type: String }],
      verifiedAt: { type: Date, default: null },
    },
  },
  { _id: false },
)

InvestigationSchema.pre("validate", function (next) {
  const investigation = this as unknown as {
    status?: string
    verificationResult?: { fidelityScore?: unknown; overallAssessment?: unknown; verifiedAt?: unknown } | undefined
    invalidate?: (path: string, errorMsg: string) => void
  }

  if (investigation.status !== "completed") return next()

  const vr = investigation.verificationResult ?? {}
  const invalidate = typeof investigation.invalidate === "function" ? investigation.invalidate.bind(investigation) : null
  if (!invalidate) return next()

  const fidelityOk = typeof vr.fidelityScore === "number" && Number.isFinite(vr.fidelityScore)
  const assessmentOk = typeof vr.overallAssessment === "string" && vr.overallAssessment.trim().length > 0
  const verifiedAtOk = vr.verifiedAt instanceof Date && !Number.isNaN(vr.verifiedAt.getTime())

  if (!fidelityOk) invalidate("verificationResult.fidelityScore", "Path `verificationResult.fidelityScore` is required.")
  if (!assessmentOk) invalidate("verificationResult.overallAssessment", "Path `verificationResult.overallAssessment` is required.")
  if (!verifiedAtOk) invalidate("verificationResult.verifiedAt", "Path `verificationResult.verifiedAt` is required.")

  return next()
})

const DataPointRowSchema = new Schema(
  {
    questionId: { type: String, required: true },
    dataPointsCovered: { type: Number, default: 0 },
  },
  { _id: false },
)

const PhaseTransitionTimestampsSchema = new Schema(
  {
    phase1Started: { type: Date },
    tier1Complete: { type: Date },
    tier2Started: { type: Date },
    phase1Signed: { type: Date },
    phase2Claimed: { type: Date },
    phase2Locked: { type: Date },
  },
  { _id: false },
)

const ContributingFactorsBlockSchema = new Schema(
  {
    status: { type: String, enum: PHASE2_SECTION_STATUS, default: "not_started" },
    factors: { type: [String], default: [] },
    notes: { type: String },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { _id: false },
)

const RootCauseBlockSchema = new Schema(
  {
    status: { type: String, enum: PHASE2_SECTION_STATUS, default: "not_started" },
    description: { type: String },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { _id: false },
)

const ReviewedInterventionRowSchema = new Schema(
  {
    interventionId: { type: String, required: true },
    stillEffective: { type: Boolean, required: true },
    notes: { type: String },
  },
  { _id: false },
)

const InterventionReviewBlockSchema = new Schema(
  {
    status: { type: String, enum: PHASE2_SECTION_STATUS, default: "not_started" },
    reviewedInterventions: { type: [ReviewedInterventionRowSchema], default: [] },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { _id: false },
)

const NewInterventionItemSchema = new Schema(
  {
    description: { type: String },
    department: { type: String, enum: INTERVENTION_DEPT },
    type: { type: String, enum: INTERVENTION_KIND },
    startDate: { type: Date },
    notes: { type: String },
  },
  { _id: false },
)

const NewInterventionBlockSchema = new Schema(
  {
    status: { type: String, enum: PHASE2_SECTION_STATUS, default: "not_started" },
    interventions: { type: [NewInterventionItemSchema], default: [] },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { _id: false },
)

const Phase2NotificationFlagsSchema = new Schema(
  {
    allSectionsCompleteNotifiedAt: { type: Date },
  },
  { _id: false },
)

const Phase2SectionsSchema = new Schema(
  {
    contributingFactors: {
      type: ContributingFactorsBlockSchema,
      default: () => ({ status: "not_started", factors: [] }),
    },
    rootCause: {
      type: RootCauseBlockSchema,
      default: () => ({ status: "not_started" }),
    },
    interventionReview: {
      type: InterventionReviewBlockSchema,
      default: () => ({ status: "not_started", reviewedInterventions: [] }),
    },
    newIntervention: {
      type: NewInterventionBlockSchema,
      default: () => ({ status: "not_started", interventions: [] }),
    },
  },
  { _id: false },
)

const AuditTrailEntrySchema = new Schema(
  {
    action: { type: String, required: true, enum: AUDIT_ACTIONS },
    performedBy: { type: String, required: true },
    performedByName: { type: String },
    timestamp: { type: Date, required: true, default: () => new Date() },
    reason: { type: String },
    previousValue: { type: String },
    newValue: { type: String },
  },
  { _id: false },
)

const IncidentSchema = new Schema<IncidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, index: true },
    organizationId: { type: String, index: true },
    facilityId: { type: String, index: true },
    title: { type: String, required: true },
    subType: { type: String },
    description: { type: String, required: true },
    incidentType: { type: String },
    location: { type: String },
    incidentDate: { type: Date },
    incidentTime: { type: String },
    witnessesPresent: { type: Boolean },
    hasInjury: { type: Boolean },
    injuryDescription: { type: String },
    residentId: { type: String, index: true },
    completenessScore: { type: Number, default: 0 },
    investigatorId: { type: String, index: true },
    investigatorName: { type: String },
    idtTeam: { type: [IdtTeamEntrySchema], default: [] },

    tier2QuestionsGenerated: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    questionsDeferred: { type: Number, default: 0 },
    questionsMarkedUnknown: { type: Number, default: 0 },
    activeDataCollectionSeconds: { type: Number, default: 0 },
    completenessAtTier1Complete: { type: Number, default: 0 },
    completenessAtSignoff: { type: Number, default: 0 },
    dataPointsPerQuestion: { type: [DataPointRowSchema], default: [] },
    phaseTransitionTimestamps: { type: PhaseTransitionTimestampsSchema, default: undefined },

    phase2Sections: { type: Phase2SectionsSchema, default: undefined },
    phase2NotificationFlags: { type: Phase2NotificationFlagsSchema, default: undefined },
    auditTrail: { type: [AuditTrailEntrySchema], default: [] },

    phase: {
      type: String,
      enum: [...INCIDENT_PHASES],
      required: true,
      default: "phase_1_in_progress",
      index: true,
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

    embedding: {
      type: [Number],
      default: null,
      select: false,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
)

IncidentSchema.index({ facilityId: 1, createdAt: -1 })
IncidentSchema.index({ facilityId: 1, phase: 1 })
IncidentSchema.index({ facilityId: 1, staffId: 1 })
IncidentSchema.index({ facilityId: 1, "phase2Sections.contributingFactors.status": 1 })

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