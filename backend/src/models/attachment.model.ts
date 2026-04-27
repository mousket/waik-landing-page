import { Schema, model, models, type Document } from "mongoose"

const PARENT = ["incident", "assessment", "resident"] as const
const LABELS = ["witness_statement", "resident_statement", "scene_photo", "medical_document", "other"] as const

export interface AttachmentDocument extends Document {
  id: string
  facilityId: string
  parentType: (typeof PARENT)[number]
  parentId: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSizeBytes: number
  label: (typeof LABELS)[number]
  uploadedById: string
  uploadedByName: string
  createdAt: Date
}

const AttachmentSchema = new Schema<AttachmentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    parentType: { type: String, required: true, enum: PARENT, index: true },
    parentId: { type: String, required: true, index: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    label: { type: String, required: true, enum: LABELS },
    uploadedById: { type: String, required: true },
    uploadedByName: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false, timestamps: false },
)

AttachmentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const AttachmentModel = models.WaikAttachment || model<AttachmentDocument>("WaikAttachment", AttachmentSchema)
export default AttachmentModel
