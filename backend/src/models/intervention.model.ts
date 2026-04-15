import { Schema, model, models, type Document } from "mongoose"

const DEPARTMENTS = ["nursing", "dietary", "therapy", "activities", "administration", "multiple"] as const
const INTERVENTION_TYPES = ["temporary", "permanent"] as const

export interface InterventionDocument extends Document {
  id: string
  facilityId: string
  residentId: string
  residentRoom: string
  description: string
  department: (typeof DEPARTMENTS)[number]
  type: (typeof INTERVENTION_TYPES)[number]
  isActive: boolean
  placedAt: Date
  removedAt?: Date
  triggeringIncidentId?: string
  notes?: string
  createdBy?: string
}

const InterventionSchema = new Schema<InterventionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    residentId: { type: String, required: true, index: true },
    residentRoom: { type: String, required: true },
    description: { type: String, required: true },
    department: { type: String, required: true, enum: DEPARTMENTS },
    type: { type: String, required: true, enum: INTERVENTION_TYPES },
    isActive: { type: Boolean, default: true },
    placedAt: { type: Date, required: true },
    removedAt: { type: Date },
    triggeringIncidentId: { type: String },
    notes: { type: String },
    createdBy: { type: String },
  },
  { versionKey: false, timestamps: false },
)

InterventionSchema.index({ facilityId: 1, residentId: 1, isActive: 1 })

InterventionSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const InterventionModel =
  models.Intervention || model<InterventionDocument>("Intervention", InterventionSchema)

export default InterventionModel
