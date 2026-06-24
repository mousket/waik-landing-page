/**
 * Send a one-off Phase 1 report email (for manual verification).
 * Run: npx tsx scripts/send-test-phase1-email.ts <incidentId> <toEmail>
 */
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

async function main() {
  const incidentId = process.argv[2] ?? "inc-83a9c2432f1e"
  const to = process.argv[3] ?? "gerardbeaubrun@yahoo.com"

  const connectMongo = (await import("../backend/src/lib/mongodb")).default
  const IncidentModel = (await import("../backend/src/models/incident.model")).default
  const { leanOne } = await import("../lib/mongoose-lean")
  const { sendPhase1ReportEmail } = await import("../lib/send-phase1-report-email")
  type IncidentDocument = import("../backend/src/models/incident.model").IncidentDocument

  await connectMongo()
  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId }).lean().exec(),
  )
  if (!incident) {
    console.error("Incident not found:", incidentId)
    process.exit(1)
  }

  await sendPhase1ReportEmail({
    to,
    incident,
    facilityName: "WAiK Demo Community",
    senderName: "WAiK System Test",
    attachPdf: true,
  })

  console.log(`Sent Phase 1 report email to ${to} for ${incidentId}`)
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
