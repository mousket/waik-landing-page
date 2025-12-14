import { Schema, model, models, type Document } from "mongoose"

export interface UserDocument extends Document {
  id: string
  username: string
  password: string
  role: "staff" | "admin"
  name: string
  email: string
  createdAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ["staff", "admin"] },
    name: { type: String, required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  {
    versionKey: false,
    timestamps: false,
  },
)

UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret.id ?? ret._id
    delete ret._id
    return ret
  },
})

export const UserModel = models.User || model<UserDocument>("User", UserSchema)

export default UserModel

