/**
 * Remove orphan / filler incidents from report testing.
 *
 * Default keeps:
 *   - inc-83a9c2432f1e (completed Helen Thompson Phase 1 report)
 *   - inc-001 … inc-010 (pilot seed scenarios, minus removed duplicates)
 *
 * Run:
 *   npx tsx scripts/cleanup-orphan-incidents.ts
 *   npx tsx scripts/cleanup-orphan-incidents.ts --dry-run
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"
import NotificationModel from "../backend/src/models/notification.model"
import IncidentAnswerVectorModel from "../backend/src/models/incident-answer-vector.model"

const KEEP_IDS = new Set([
  "inc-83a9c2432f1e", // completed Helen Thompson Phase 1 (signed)
  // Pilot seed (non-Okafor scenarios only; inc-005 / inc-008 removed — duplicate James Okafor)
  "inc-001",
  "inc-002",
  "inc-003",
  "inc-004",
  "inc-006",
  "inc-007",
  "inc-009",
  "inc-010",
])

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  await connectMongo()

  const all = await IncidentModel.find({}).select("id residentName createdAt staffName phase").lean().exec()
  const toDelete = all.filter((r) => !KEEP_IDS.has(String(r.id)))

  console.log(dryRun ? "[DRY RUN]" : "[DELETE]")
  console.log(`Keeping ${KEEP_IDS.size} incidents:`)
  for (const id of [...KEEP_IDS].sort()) {
    const row = all.find((r) => r.id === id)
    console.log(
      `  ${id}${row ? ` — ${row.residentName} (${row.phase})` : " — (not in DB, skip)"}`,
    )
  }
  console.log(`\nDeleting ${toDelete.length} incidents:`)
  for (const r of toDelete) {
    console.log(`  ${r.id} — ${r.residentName} — ${r.phase} — ${r.createdAt}`)
  }

  const deleteIds = toDelete.map((r) => r.id)
  if (deleteIds.length === 0) {
    console.log("\nNothing to delete.")
    await mongoose.disconnect()
    return
  }

  if (!dryRun) {
    const vectors = await IncidentAnswerVectorModel.deleteMany({ incidentId: { $in: deleteIds } })
    const notif = await NotificationModel.deleteMany({ incidentId: { $in: deleteIds } })
    const inc = await IncidentModel.deleteMany({ id: { $in: deleteIds } })
    console.log(
      `\nDeleted ${inc.deletedCount} incidents, ${notif.deletedCount} notifications, ${vectors.deletedCount} answer vectors.`,
    )
  } else {
    console.log("\nDry run only — no documents removed.")
  }

  const remaining = await IncidentModel.countDocuments({})
  console.log(`Remaining incidents in DB: ${remaining}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
