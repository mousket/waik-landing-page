import { Schema, model, models, type Document } from "mongoose"

export type ResidentCareLevel = "independent" | "assisted" | "memory_care" | "skilled_nursing"

export interface ResidentDocument extends Document {
  id: string
  facilityId: string
  organizationId: string
  firstName: string
  lastName: string
  roomNumber: string
  wing?: string
  dateOfBirth?: Date
  admissionDate?: Date
  primaryDiagnosis?: string
  secondaryDiagnoses?: string[]
  primaryPhysician?: string
  careLevel: ResidentCareLevel
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

const ResidentSchema = new Schema<ResidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roomNumber: { type: String, default: "" },
    wing: { type: String },
    dateOfBirth: { type: Date },
    admissionDate: { type: Date },
    primaryDiagnosis: { type: String },
    secondaryDiagnoses: { type: [String], default: [] },
    primaryPhysician: { type: String },
    careLevel: {
      type: String,
      enum: ["independent", "assisted", "memory_care", "skilled_nursing"],
      required: true,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

ResidentSchema.index({ facilityId: 1, lastName: 1, firstName: 1 })

ResidentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const ResidentModel = models.Resident || model<ResidentDocument>("Resident", ResidentSchema)

export default ResidentModel
