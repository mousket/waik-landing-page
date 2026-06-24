import "dotenv/config"
import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"
import { backfillIncidentAnswerVectors } from "../lib/agents/backfill-incident-answer-vectors"

function requireArg(name: string): string {
  const idx = process.argv.findIndex((a) => a === `--${name}`)
  if (idx === -1) return ""
  return (process.argv[idx + 1] ?? "").trim()
}

async function main() {
  const facilityId = requireArg("facilityId") || process.env.FACILITY_ID || ""
  const incidentId = requireArg("incidentId") || ""

  if (!facilityId) {
    throw new Error("Missing facilityId. Provide --facilityId <id> or set FACILITY_ID.")
  }

  await connectMongo()

  if (incidentId) {
    const embedded = await backfillIncidentAnswerVectors(incidentId, facilityId)
    console.log(`[backfill-incident-answer-vectors] incident=${incidentId} embedded=${embedded}`)
    await mongoose.disconnect()
    return
  }

  const incidents = await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_in_progress", "phase_1_complete", "phase_2_in_progress", "closed"] },
  })
    .select("id")
    .lean()
    .exec()

  let total = 0
  for (const row of incidents as Array<{ id?: string }>) {
    const id = String(row.id ?? "").trim()
    if (!id) continue
    total += await backfillIncidentAnswerVectors(id, facilityId)
  }

  console.log(`[backfill-incident-answer-vectors] facility=${facilityId} incidents=${incidents.length} vectors=${total}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error("[backfill-incident-answer-vectors] failed:", e)
  process.exitCode = 1
})
