import "dotenv/config"
import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"
import FacilityModel from "../backend/src/models/facility.model"

function requireArg(name: string): string {
  const idx = process.argv.findIndex((a) => a === `--${name}`)
  if (idx === -1) return ""
  return (process.argv[idx + 1] ?? "").trim()
}

function toInt(raw: string, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

type Row = {
  id: string
  facilityId?: string
  phase?: string
  embedding?: number[] | null
  investigation?: { verificationResult?: { fidelityScore?: number } }
}

async function main() {
  const facilityId = requireArg("facilityId") || process.env.FACILITY_ID || ""
  const days = toInt(requireArg("days"), 30)

  if (!facilityId) {
    await connectMongo()
    const facilities = await FacilityModel.find({ isActive: true })
      .select(["id", "name"])
      .limit(8)
      .lean()
      .exec()
    // eslint-disable-next-line no-console
    console.log(
      [
        "Missing facilityId. Provide --facilityId <id> or set FACILITY_ID.",
        "Here are up to 8 active facilities:",
        ...facilities.map((f) => `- ${String((f as { id?: unknown }).id ?? "")}  ${(f as { name?: unknown }).name ?? ""}`),
      ].join("\n"),
    )
    process.exitCode = 2
    await mongoose.disconnect()
    return
  }

  await connectMongo()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = (await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    createdAt: { $gte: since },
  })
    .select("+embedding id facilityId phase investigation.verificationResult.fidelityScore createdAt")
    .lean()
    .exec()) as unknown as Row[]

  const total = rows.length
  const withEmbedding = rows.filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0)
  const dimsOk = withEmbedding.filter((r) => (r.embedding ?? []).length === 1536)
  const withVerification = rows.filter((r) => typeof r.investigation?.verificationResult?.fidelityScore === "number")

  const fmt = (n: number) => `${n}/${total}${total ? ` (${Math.round((n / total) * 100)}%)` : ""}`

  // eslint-disable-next-line no-console
  console.log(
    [
      `IR-2g verification — facilityId=${facilityId} window=${days}d`,
      `signed incidents: ${total}`,
      `embeddings present: ${fmt(withEmbedding.length)}`,
      `embeddings dims=1536: ${fmt(dimsOk.length)}`,
      `verificationResult present: ${fmt(withVerification.length)}`,
    ].join("\n"),
  )

  if (total === 0) {
    // eslint-disable-next-line no-console
    console.log("No signed incidents found in window; create a few reports and rerun.")
    process.exitCode = 2
    await mongoose.disconnect()
    return
  }

  if (withEmbedding.length !== total || dimsOk.length !== total || withVerification.length !== total) {
    process.exitCode = 1
  }

  await mongoose.disconnect()
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[verify-ir2g] failed:", e)
  process.exitCode = 1
})

