import { Schema, model, models, type Document } from "mongoose"
import { randomUUID } from "node:crypto"

export type ActivityLogAction =
  | "login"
  | "incident_created"
  | "phase2_claimed"
  | "investigation_closed"
  | "user_invited"
  | "role_changed"
  | "user_deactivated"
  | "assessment_completed"

export interface ActivityLogDocument extends Document {
  id: string
  userId: string
  userName: string
  role: string
  facilityId: string
  action: ActivityLogAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    role: { type: String, default: "" },
    facilityId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  {
    versionKey: false,
  },
)

ActivityLogSchema.index({ facilityId: 1, createdAt: -1 })

export function newActivityLogId() {
  return `act-${randomUUID()}`
}

const ActivityLogModel = models.ActivityLog || model<ActivityLogDocument>("ActivityLog", ActivityLogSchema)

export default ActivityLogModel
