import bcrypt from "bcryptjs"
import connectMongo from "../lib/mongodb"
import UserModel from "../models/user.model"
import type { User } from "../../lib/types"

const toPlain = <T>(doc: any): T | null => {
  if (!doc) return null
  return JSON.parse(JSON.stringify(doc)) as T
}

export class UserService {
  static async listUsers() {
    await connectMongo()
    const users = await UserModel.find({}).lean().exec()
    return users.map((user) => JSON.parse(JSON.stringify(user)) as User)
  }

  static async findById(id: string) {
    await connectMongo()
    const user = await UserModel.findOne({ id }).lean().exec()
    return toPlain<User>(user)
  }

  static async findByCredentials(username: string, password: string) {
    await connectMongo()
    const user = await UserModel.findOne({ username }).lean().exec()
    if (!user) return null

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return null

    return toPlain<User>(user)
  }
}

export default UserService

