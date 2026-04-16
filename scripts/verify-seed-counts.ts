/**
 * One-off helper for task-00k TEST 2: print collection counts after seed.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/verify-seed-counts.ts
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import OrganizationModel from "../backend/src/models/organization.model"
import FacilityModel from "../backend/src/models/facility.model"
import UserModel from "../backend/src/models/user.model"
import ResidentModel from "../backend/src/models/resident.model"
import IncidentModel from "../backend/src/models/incident.model"
import InterventionModel from "../backend/src/models/intervention.model"
import AssessmentModel from "../backend/src/models/assessment.model"

const SEED_USER_IDS = [
  "user-admin-001",
  "user-don-001",
  "user-hn-001",
  "user-rn-001",
  "user-rn-002",
  "user-cna-001",
  "user-pt-001",
  "user-diet-001",
]

async function main() {
  await connectMongo()

  const [
    organizations,
    facilities,
    usersTotal,
    seedUsers,
    residents,
    incidents,
    interventions,
    assessments,
  ] = await Promise.all([
    OrganizationModel.countDocuments({}),
    FacilityModel.countDocuments({}),
    UserModel.countDocuments({}),
    UserModel.countDocuments({ id: { $in: SEED_USER_IDS } }),
    ResidentModel.countDocuments({}),
    IncidentModel.countDocuments({}),
    InterventionModel.countDocuments({}),
    AssessmentModel.countDocuments({}),
  ])

  const activeInterventions = await InterventionModel.countDocuments({ isActive: true })
  const inactiveInterventions = await InterventionModel.countDocuments({ isActive: false })

  console.log(JSON.stringify({
    organizations,
    facilities,
    usersTotal,
    seedUsers,
    residents,
    incidents,
    interventions,
    assessments,
    interventionsActive: activeInterventions,
    interventionsInactive: inactiveInterventions,
  }, null, 2))

  const expected = {
    organizations: 1,
    facilities: 1,
    seedUsers: 8,
    residents: 5,
    incidents: 10,
    interventions: 5,
    assessments: 3,
  }

  const ok =
    organizations === expected.organizations &&
    facilities === expected.facilities &&
    seedUsers === expected.seedUsers &&
    residents === expected.residents &&
    incidents === expected.incidents &&
    interventions === expected.interventions &&
    assessments === expected.assessments &&
    activeInterventions === 4 &&
    inactiveInterventions === 1

  console.log(ok ? "VERIFY_COUNTS_OK" : "VERIFY_COUNTS_FAIL")
  await mongoose.disconnect()
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
