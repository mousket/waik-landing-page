import { Schema, model, models, type Document } from "mongoose"

export interface NotificationDocument extends Document {
  id: string
  incidentId: string
  type:
    | "incident-created"
    | "investigation-started"
    | "follow-up-required"
    | "investigation-completed"
    | "phase2-all-sections-complete"
    | "phase2-pending-signature"
    | "investigation-reporter-closed"
  message: string
  createdAt: Date
  readAt?: Date
  targetUserId: string
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
  },
  {
    versionKey: false,
    timestamps: false,
  },
)

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

