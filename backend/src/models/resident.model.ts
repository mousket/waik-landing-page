import { Schema, model, models, type Document } from "mongoose"

export type ResidentCareLevel = "independent" | "assisted" | "memory_care" | "skilled_nursing"
export type ResidentStatus = "active" | "inactive" | "discharged" | "on-leave"

const RESIDENT_GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const
const RESIDENT_STATUS: ResidentStatus[] = ["active", "inactive", "discharged", "on-leave"]

export interface EmergencyContact {
  name?: string
  relationship?: string
  phone?: string
}

export interface ResidentDocument extends Document {
  id: string
  facilityId: string
  organizationId: string
  firstName: string
  lastName: string
  preferredName?: string
  roomNumber: string
  wing?: string
  dateOfBirth?: Date
  admissionDate?: Date
  primaryDiagnosis?: string
  secondaryDiagnoses?: string[]
  primaryPhysician?: string
  careLevel: ResidentCareLevel
  status: ResidentStatus
  gender?: (typeof RESIDENT_GENDERS)[number]
  /** Legacy alias; prefer organizationId for new code. */
  orgId?: string
  emergencyContact?: EmergencyContact
  createdAt: Date
  updatedAt: Date
}

const ResidentSchema = new Schema<ResidentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    orgId: { type: String, required: false, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    preferredName: { type: String, required: false },
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
    gender: { type: String, required: false, enum: RESIDENT_GENDERS },
    status: { type: String, enum: RESIDENT_STATUS, default: "active" },
    emergencyContact: {
      _id: false,
      type: {
        name: { type: String, required: false },
        relationship: { type: String, required: false },
        phone: { type: String, required: false },
      },
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

ResidentSchema.index({ facilityId: 1, lastName: 1, firstName: 1 })
ResidentSchema.index({ facilityId: 1, roomNumber: 1 })

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
