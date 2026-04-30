import "dotenv/config"
import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"
import { generateEmbedding } from "../lib/openai"

function requireArg(name: string): string {
  const idx = process.argv.findIndex((a) => a === `--${name}`)
  if (idx === -1) return ""
  return (process.argv[idx + 1] ?? "").trim()
}

async function main() {
  const facilityId = requireArg("facilityId") || process.env.FACILITY_ID || ""
  if (!facilityId) {
    throw new Error("Missing facilityId. Provide --facilityId <id> or set FACILITY_ID.")
  }
  await connectMongo()
  const incidents = await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    $or: [{ embedding: { $exists: false } }, { embedding: null }, { embedding: { $eq: [] } }],
  })
    .select([
      "id",
      "facilityId",
      "description",
      "incidentType",
      "residentName",
      "residentRoom",
      "location",
      "incidentDate",
      "summary",
      "initialReport",
    ])
    .lean()
    .exec()

  let processed = 0
  let failed = 0

  for (const inc of incidents as unknown as Array<any>) {
    try {
      const narrative =
        (inc.initialReport?.enhancedNarrative ?? "").trim() ||
        (inc.initialReport?.narrative ?? "").trim() ||
        (inc.summary ?? "").trim() ||
        (inc.description ?? "").trim()

      const text = [
        `Incident Type: ${inc.incidentType || "unknown"}`,
        `Resident: ${inc.residentName || ""}, Room ${inc.residentRoom || ""}`,
        `Location: ${inc.location || ""}`,
        `Date: ${inc.incidentDate ? new Date(inc.incidentDate).toISOString() : ""}`,
        "",
        narrative,
      ].join("\n")

      const embedding = await generateEmbedding(text)
      await IncidentModel.updateOne({ id: inc.id, facilityId }, { $set: { embedding } }).exec()
      processed++
    } catch {
      failed++
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[backfill-incident-embeddings] facilityId=${facilityId}`, { processed, failed })
  await mongoose.disconnect()
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[backfill-incident-embeddings] failed:", e)
  process.exitCode = 1
})

