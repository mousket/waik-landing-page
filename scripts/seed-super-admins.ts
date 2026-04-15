/**
 * One-time (idempotent) seed: WAiK super admins in Clerk + MongoDB.
 * Requires: DATABASE_URL, CLERK_SECRET_KEY, roles seeded (`npm run seed:roles`).
 * Password: SUPER_ADMIN_TEMP_PASSWORD or default below.
 */
import path from "path"
import dotenv from "dotenv"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")
dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

import { createClerkClient } from "@clerk/backend"
import connectMongo from "../backend/src/lib/mongodb"
import UserModel from "../backend/src/models/user.model"

const DEFAULT_TEMP_PASSWORD = "WaiK@SuperAdmin2026!"

const superAdmins = [
  {
    firstName: "Gerard",
    lastName: "Beaubrun",
    email: "gerard@waik.care",
    tempPassword: process.env.SUPER_ADMIN_TEMP_PASSWORD || DEFAULT_TEMP_PASSWORD,
  },
  {
    firstName: "Scott",
    lastName: "Kallstrom",
    email: "scott@waik.care",
    tempPassword: process.env.SUPER_ADMIN_TEMP_PASSWORD || DEFAULT_TEMP_PASSWORD,
  },
] as const

function generateId(email: string): string {
  return `sa-${email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
}

function superAdminPublicMetadata() {
  return {
    role: "administrator" as const,
    isWaikSuperAdmin: true,
    orgId: "",
    facilityId: "",
  }
}

async function resolveClerkUser(
  clerk: ReturnType<typeof createClerkClient>,
  email: string,
  firstName: string,
  lastName: string,
  tempPassword: string,
): Promise<string> {
  const normalized = email.toLowerCase()
  const meta = superAdminPublicMetadata()

  async function ensureMetadata(userId: string) {
    await clerk.users.updateUser(userId, {
      firstName,
      lastName,
      publicMetadata: meta,
    })
  }

  const listed = await clerk.users.getUserList({ emailAddress: [normalized], limit: 10 })
  const existing = listed.data[0]
  if (existing?.id) {
    await ensureMetadata(existing.id)
    return existing.id
  }

  try {
    const created = await clerk.users.createUser({
      firstName,
      lastName,
      emailAddress: [normalized],
      password: tempPassword,
      publicMetadata: meta,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    })
    return created.id
  } catch (err) {
    const retry = await clerk.users.getUserList({ emailAddress: [normalized], limit: 10 })
    const found = retry.data[0]
    if (found?.id) {
      await ensureMetadata(found.id)
      return found.id
    }
    throw err
  }
}

async function upsertMongoUser(
  clerkUserId: string,
  firstName: string,
  lastName: string,
  email: string,
): Promise<void> {
  const normalized = email.toLowerCase()
  const payload = {
    id: generateId(normalized),
    clerkUserId,
    firstName,
    lastName,
    email: normalized,
    roleSlug: "administrator",
    isWaikSuperAdmin: true,
    isActive: true,
    mustChangePassword: false,
    deviceType: "work" as const,
    organizationId: "",
    facilityId: "",
  }

  const existing = await UserModel.findOne({ email: normalized }).exec()
  if (existing) {
    await UserModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...payload,
          id: existing.id || payload.id,
        },
      },
    )
    return
  }

  await UserModel.create(payload)
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required")
  }

  const clerk = createClerkClient({ secretKey })
  await connectMongo()

  for (const row of superAdmins) {
    const clerkUserId = await resolveClerkUser(
      clerk,
      row.email,
      row.firstName,
      row.lastName,
      row.tempPassword,
    )
    await upsertMongoUser(clerkUserId, row.firstName, row.lastName, row.email)
    console.log(`✓ Super admin seeded: ${row.email}`)
  }

  console.log("Super admins seeded successfully")
  process.exit(0)
}

main().catch((error) => {
  console.error("Seeding failed:", error)
  process.exit(1)
})
