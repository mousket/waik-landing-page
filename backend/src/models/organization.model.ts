import { Schema, model, models, type Document } from "mongoose"

const PrimaryContactSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false },
)

export interface OrganizationDocument extends Document {
  id: string
  name: string
  type: "snf_chain" | "independent" | "government" | "nonprofit" | "other"
  primaryContact: {
    name: string
    email: string
    phone: string
  }
  plan: "pilot" | "enterprise"
  createdBySuperId: string
  isActive: boolean
  /**
   * Clerk `org_…` id — set when the org is mirrored in Clerk (Organizations) so
   * facility users can be added as org members and skip “create your organization” at sign-in.
   */
  clerkOrganizationId?: string
  createdAt: Date
  updatedAt: Date
}

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["snf_chain", "independent", "government", "nonprofit", "other"],
    },
    primaryContact: { type: PrimaryContactSchema, default: () => ({}) },
    plan: { type: String, enum: ["pilot", "enterprise"], default: "pilot" },
    createdBySuperId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    clerkOrganizationId: { type: String, required: false, index: true, sparse: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

OrganizationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const OrganizationModel =
  models.Organization || model<OrganizationDocument>("Organization", OrganizationSchema)

export default OrganizationModel
