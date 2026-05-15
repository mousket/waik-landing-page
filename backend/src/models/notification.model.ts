import { Schema, model, models, type Document } from "mongoose"

export type NotificationCategory = "incident" | "assessment" | "investigation" | "system" | "intelligence"
export type NotificationPriority = "urgent" | "normal" | "low"

/** Notification event discriminator (persisted); drives inbox copy + semantics. */
export type NotificationEventType =
  | "incident-created"
  | "investigation-started"
  | "investigation-ready"
  | "follow-up-required"
  | "investigation-completed"
  | "phase2-all-sections-complete"
  | "phase2-pending-signature"
  | "investigation-reporter-closed"

export interface NotificationDocument extends Document {
  id: string
  incidentId: string
  type: NotificationEventType
  message: string
  createdAt: Date
  readAt?: Date
  targetUserId: string
  facilityId?: string
  actionUrl?: string
  category: NotificationCategory
  priority: NotificationPriority
  actorName?: string
  isArchived?: boolean
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    incidentId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "incident-created",
        "investigation-started",
        "investigation-ready",
        "follow-up-required",
        "investigation-completed",
        "phase2-all-sections-complete",
        "phase2-pending-signature",
        "investigation-reporter-closed",
      ],
    },
    message: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    readAt: { type: Date },
    targetUserId: { type: String, required: true, index: true },
    facilityId: { type: String, index: true },
    actionUrl: { type: String },
    category: {
      type: String,
      required: true,
      enum: ["incident", "assessment", "investigation", "system", "intelligence"],
      default: "system",
    },
    priority: {
      type: String,
      enum: ["urgent", "normal", "low"],
      default: "normal",
    },
    actorName: { type: String },
    isArchived: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    timestamps: false,
  },
)

NotificationSchema.index({ targetUserId: 1, readAt: 1 })
NotificationSchema.index({ facilityId: 1, createdAt: -1 })

NotificationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const NotificationModel =
  models.Notification || model<NotificationDocument>("Notification", NotificationSchema)

export default NotificationModel
