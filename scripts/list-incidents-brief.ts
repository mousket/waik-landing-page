/**
 * List incidents (newest first) for cleanup review.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/list-incidents-brief.ts
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"

async function main() {
  await connectMongo()
  const rows = await IncidentModel.find({})
    .select(
      "id residentName residentRoom phase staffName createdAt updatedAt questions completenessScore description incidentType",
    )
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  for (const r of rows) {
    const questions = Array.isArray(r.questions) ? r.questions : []
    const answered = questions.filter((q) => (q as { answer?: unknown }).answer).length
    const narrative = (r as { initialReport?: { narrative?: string } }).initialReport?.narrative?.trim() ?? ""
    console.log(
      [
        r.id,
        r.createdAt?.toISOString?.() ?? r.createdAt,
        r.phase ?? "—",
        `q=${questions.length}/${answered}`,
        `score=${r.completenessScore ?? 0}`,
        r.residentName,
        r.residentRoom,
        r.staffName,
        narrative ? `narr=${narrative.slice(0, 30)}…` : "narr=—",
      ].join(" | "),
    )
  }
  console.log(`\nTOTAL: ${rows.length}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
