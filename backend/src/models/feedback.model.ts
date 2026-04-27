import { randomUUID } from "node:crypto"
import { Schema, model, models, type Document } from "mongoose"

export interface PilotFeedbackDocument extends Document {
  id: string
  facilityId: string
  userId?: string
  /** 1 = up / helpful, 0 = down (thumb scale) */
  rating: 0 | 1
  comment: string
  createdAt: Date
}

const PilotFeedbackSchema = new Schema<PilotFeedbackDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    userId: { type: String },
    rating: { type: Number, required: true, min: 0, max: 1 },
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
