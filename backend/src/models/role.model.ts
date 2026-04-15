import { Schema, model, models, type Document } from "mongoose"

export interface RoleDocument extends Document {
  id: string
  name: string
  slug: string
  description?: string
  permissions: string[]
  isAdminTier: boolean
  canAccessPhase2: boolean
  canInviteStaff: boolean
  canManageResidents: boolean
  canViewIntelligence: boolean
  facilityScoped: boolean
  createdAt: Date
  updatedAt: Date
}

const RoleSchema = new Schema<RoleDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    permissions: { type: [String], default: [] },
    isAdminTier: { type: Boolean, default: false },
    canAccessPhase2: { type: Boolean, default: false },
    canInviteStaff: { type: Boolean, default: false },
    canManageResidents: { type: Boolean, default: false },
    canViewIntelligence: { type: Boolean, default: true },
    facilityScoped: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

RoleSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const RoleModel = models.Role || model<RoleDocument>("Role", RoleSchema)

export default RoleModel
