import { Schema, model, models, type Document } from "mongoose"

const PrimaryContactSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false },
)

const ReportingConfigSchema = new Schema(
  {
    mandatedReportingWindowHours: { type: Number, default: 2 },
  },
  { _id: false },
)

const CompletionThresholdsSchema = new Schema(
  {
    fall: { type: Number, default: 75 },
    medication_error: { type: Number, default: 80 },
    resident_conflict: { type: Number, default: 70 },
    wound_injury: { type: Number, default: 80 },
    abuse_neglect: { type: Number, default: 90 },
  },
  { _id: false },
)

export interface FacilityDocument extends Document {
  id: string
  organizationId: string
  name: string
  type: "snf" | "alf" | "memory_care" | "ccrc" | "other"
  state: string
  bedCount?: number
  primaryContact: {
    name: string
    email: string
    phone: string
  }
  reportingConfig: {
    mandatedReportingWindowHours: number
  }
  phaseMode: "two_phase" | "one_phase"
  completionThresholds: {
    fall: number
    medication_error: number
    resident_conflict: number
    wound_injury: number
    abuse_neglect: number
  }
  notificationPreferences: Record<string, unknown>
  units: string[]
  plan: "pilot" | "enterprise"
  onboardingDate?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const FacilitySchema = new Schema<FacilityDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["snf", "alf", "memory_care", "ccrc", "other"],
    },
    state: { type: String, required: true },
    bedCount: { type: Number },
    primaryContact: { type: PrimaryContactSchema, default: () => ({}) },
    reportingConfig: { type: ReportingConfigSchema, default: () => ({ mandatedReportingWindowHours: 2 }) },
    phaseMode: { type: String, enum: ["two_phase", "one_phase"], default: "two_phase" },
    completionThresholds: {
      type: CompletionThresholdsSchema,
      default: () => ({}),
    },
    notificationPreferences: { type: Schema.Types.Mixed, default: {} },
    units: { type: [String], default: [] },
    plan: { type: String, enum: ["pilot", "enterprise"], default: "pilot" },
    onboardingDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

FacilitySchema.index({ organizationId: 1, isActive: 1 })

FacilitySchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const FacilityModel = models.Facility || model<FacilityDocument>("Facility", FacilitySchema)

export default FacilityModel
