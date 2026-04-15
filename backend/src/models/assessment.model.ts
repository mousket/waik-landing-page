import { Schema, model, models, type Document } from "mongoose"

const ASSESSMENT_TYPES = ["activity", "dietary", "clinical", "behavioral"] as const
const ASSESSMENT_STATUS = ["scheduled", "in_progress", "completed", "overdue"] as const

export interface AssessmentDocument extends Document {
  id: string
  facilityId: string
  organizationId?: string
  residentId: string
  residentRoom: string
  assessmentType: (typeof ASSESSMENT_TYPES)[number]
  conductedById: string
  conductedByName: string
  conductedAt: Date
  completenessScore: number
  status: (typeof ASSESSMENT_STATUS)[number]
  nextDueAt?: Date
}

const AssessmentSchema = new Schema<AssessmentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    organizationId: { type: String, index: true },
    residentId: { type: String, required: true, index: true },
    residentRoom: { type: String, required: true },
    assessmentType: { type: String, required: true, enum: ASSESSMENT_TYPES },
    conductedById: { type: String, required: true },
    conductedByName: { type: String, required: true },
    conductedAt: { type: Date, required: true },
    completenessScore: { type: Number, required: true },
    status: { type: String, required: true, enum: ASSESSMENT_STATUS, default: "completed" },
    nextDueAt: { type: Date },
  },
  { versionKey: false, timestamps: false },
)

AssessmentSchema.index({ facilityId: 1, residentId: 1, conductedAt: -1 })

AssessmentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const AssessmentModel =
  models.Assessment || model<AssessmentDocument>("Assessment", AssessmentSchema)

export default AssessmentModel
