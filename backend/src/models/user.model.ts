import { Schema, model, models, type Document } from "mongoose"

export interface UserDocument extends Document {
  /** Business id (legacy lowdb / incidents) */
  id: string
  clerkUserId?: string
  organizationId?: string
  facilityId?: string
  firstName?: string
  lastName?: string
  email: string
  roleSlug: string
  isWaikSuperAdmin: boolean
  deviceType: "personal" | "work"
  mustChangePassword: boolean
  isActive: boolean
  selectedUnit?: string
  selectedUnitDate?: string
  lastLoginAt?: Date
  /** Legacy password auth */
  username?: string
  password?: string
  /** Legacy role bucket */
  role?: "staff" | "admin"
  /** Legacy display name */
  name?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    clerkUserId: { type: String, unique: true, sparse: true, index: true },
    organizationId: { type: String, index: true },
    facilityId: { type: String, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    roleSlug: { type: String, required: true, index: true },
    isWaikSuperAdmin: { type: Boolean, default: false },
    deviceType: { type: String, enum: ["personal", "work"], default: "personal" },
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    selectedUnit: { type: String },
    selectedUnitDate: { type: String },
    lastLoginAt: { type: Date },
    username: { type: String, index: true, sparse: true },
    password: { type: String },
    role: {
      type: String,
      enum: [
        "owner",
        "administrator",
        "director_of_nursing",
        "head_nurse",
        "rn",
        "lpn",
        "cna",
        "staff",
        "physical_therapist",
        "dietician",
        "admin",
      ],
    },
    name: { type: String, default: "" },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

UserSchema.index({ facilityId: 1, roleSlug: 1 })

UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const UserModel = models.User || model<UserDocument>("User", UserSchema)

export default UserModel
