/**
 * Local debug helper: count incidents by facility + phase.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/check-incident-data.ts
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"

type GroupRow = { _id: unknown; n: number }

async function main() {
  await connectMongo()

  const total = await IncidentModel.countDocuments({})
  const byPhase = (await IncidentModel.aggregate<GroupRow>([
    { $group: { _id: "$phase", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])) as GroupRow[]

  const byFacility = (await IncidentModel.aggregate<GroupRow>([
    { $group: { _id: "$facilityId", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 25 },
  ])) as GroupRow[]

  const byFacilityAndPhase = (await IncidentModel.aggregate<GroupRow>([
    { $group: { _id: { facilityId: "$facilityId", phase: "$phase" }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 100 },
  ])) as GroupRow[]

  const phase1InProgress = await IncidentModel.countDocuments({ phase: "phase_1_in_progress" })
  const phase1Complete = await IncidentModel.countDocuments({ phase: "phase_1_complete" })
  const phase2InProgress = await IncidentModel.countDocuments({ phase: "phase_2_in_progress" })
  const closed = await IncidentModel.countDocuments({ phase: "closed" })

  // Intentionally do not print DATABASE_URL / secrets.
  console.log(JSON.stringify({ total, phaseCounts: { phase1InProgress, phase1Complete, phase2InProgress, closed } }))
  console.log(JSON.stringify({ byPhase, byFacility, byFacilityAndPhase }))

  await mongoose.disconnect()
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e)
  console.error("CHECK_INCIDENT_DATA_FAILED:", msg)
  process.exit(1)
})

