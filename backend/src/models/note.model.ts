import { Schema, model, models, type Document } from "mongoose"

const PARENT = ["incident", "assessment", "resident"] as const
const VIS = ["team", "admin_only", "sealed"] as const

export interface NoteDocument extends Document {
  id: string
  facilityId: string
  parentType: (typeof PARENT)[number]
  parentId: string
  content: string
  authorId: string
  authorName: string
  authorRole: string
  visibility: (typeof VIS)[number]
  isFlagged: boolean
  createdAt: Date
}

const NoteSchema = new Schema<NoteDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    parentType: { type: String, required: true, enum: PARENT, index: true },
    parentId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    visibility: { type: String, required: true, enum: VIS, default: "team" },
    isFlagged: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false, timestamps: false },
)

NoteSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    const o = ret as unknown as Record<string, unknown>
    o.id = o.id ?? o._id
    delete o._id
    return o
  },
})

export const NoteModel = models.Note || model<NoteDocument>("Note", NoteSchema)
export default NoteModel
