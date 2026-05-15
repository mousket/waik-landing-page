import { Schema, model, models, type Document } from "mongoose"

export interface PushSubscriptionDocument extends Document {
  id: string
  userId: string
  facilityId: string
  /** Canonical browser endpoint for upserts */
  endpoint: string
  subscription: {
    endpoint: string
    keys?: { p256dh?: string; auth?: string }
    expirationTime?: number | null
  }
  deviceType: "personal" | "work"
  userAgent?: string
  isActive: boolean
  createdAt: Date
  lastUsedAt?: Date
}

const PushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, index: true },
    subscription: { type: Schema.Types.Mixed, required: true },
    deviceType: { type: String, enum: ["personal", "work"], default: "personal" },
    userAgent: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date },
  },
  { versionKey: false },
)

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true })

PushSubscriptionSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const PushSubscriptionModel =
  models.PushSubscription || model<PushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema)

export default PushSubscriptionModel
