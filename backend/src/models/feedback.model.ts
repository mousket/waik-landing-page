import { randomUUID } from "node:crypto"
import { Schema, model, models, type Document } from "mongoose"

export interface PilotFeedbackDocument extends Document {
  id: string
  facilityId: string
  userId?: string
  incidentId?: string
  /** -1 = not helpful, 0 = mixed, 1 = helpful (legacy documents may only have 0/1) */
  rating: -1 | 0 | 1
  comment: string
  createdAt: Date
}

const PilotFeedbackSchema = new Schema<PilotFeedbackDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    userId: { type: String },
    incidentId: { type: String, index: true, sparse: true },
    rating: { type: Number, required: true, min: -1, max: 1 },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false },
)

PilotFeedbackSchema.index({ facilityId: 1, createdAt: -1 })

export function newFeedbackId() {
  return `fb-${randomUUID()}`
}

const PilotFeedbackModel = models.PilotFeedback || model<PilotFeedbackDocument>("PilotFeedback", PilotFeedbackSchema)
export default PilotFeedbackModel
