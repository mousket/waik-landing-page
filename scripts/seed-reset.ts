/**
 * Removes pilot seed documents from MongoDB and bans corresponding Clerk users (seed emails).
 * Run `npm run seed:dev` afterward to recreate data.
 */
import path from "path"
import dotenv from "dotenv"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")
dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

import mongoose from "mongoose"
import { createClerkClient } from "@clerk/backend"
import connectMongo from "../backend/src/lib/mongodb"
import OrganizationModel from "../backend/src/models/organization.model"
import FacilityModel from "../backend/src/models/facility.model"
import UserModel from "../backend/src/models/user.model"
import ResidentModel from "../backend/src/models/resident.model"
import IncidentModel from "../backend/src/models/incident.model"
import InterventionModel from "../backend/src/models/intervention.model"
import AssessmentModel from "../backend/src/models/assessment.model"

const seedIds = {
  organizations: ["org-sunrise-001"],
  facilities: ["fac-sunrise-mpls-001"],
  users: [
    "user-admin-001",
    "user-don-001",
    "user-hn-001",
    "user-rn-001",
    "user-rn-002",
    "user-cna-001",
    "user-pt-001",
    "user-diet-001",
  ],
  residents: ["res-001", "res-002", "res-003", "res-004", "res-005"],
  incidents: [
    "inc-001",
    "inc-002",
    "inc-003",
    "inc-004",
    "inc-005",
    "inc-006",
    "inc-007",
    "inc-008",
    "inc-009",
    "inc-010",
  ],
  interventions: ["int-001", "int-002", "int-003", "int-004", "int-005"],
  assessments: ["assess-001", "assess-002", "assess-003"],
}

async function resetSeedData() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for seed:reset (Clerk ban step)")
  }

  console.log("\n🗑️  Resetting seed data...")

  await connectMongo()
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const seedUsers = await UserModel.find({ id: { $in: seedIds.users } }).lean().exec()
  for (const user of seedUsers) {
    const clerkUserId = user.clerkUserId
    if (clerkUserId) {
      try {
        await clerk.users.updateUser(clerkUserId, { banned: true } as never)
        console.log(`  Banned Clerk user: ${user.email}`)
      } catch (e) {
        console.log(`  Could not ban Clerk user ${user.email} — ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  await AssessmentModel.deleteMany({ id: { $in: seedIds.assessments } })
  await InterventionModel.deleteMany({ id: { $in: seedIds.interventions } })
  await IncidentModel.deleteMany({ id: { $in: seedIds.incidents } })
  await ResidentModel.deleteMany({ id: { $in: seedIds.residents } })
  await UserModel.deleteMany({ id: { $in: seedIds.users } })
  await FacilityModel.deleteMany({ id: { $in: seedIds.facilities } })
  await OrganizationModel.deleteMany({ id: { $in: seedIds.organizations } })

  console.log("  ✓ Reset complete. Run npm run seed:dev to restore.")
  await mongoose.disconnect()
}

resetSeedData().catch((err) => {
  console.error(err)
  process.exit(1)
})
