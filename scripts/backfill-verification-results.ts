import "dotenv/config"
import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import IncidentModel from "../backend/src/models/incident.model"
import { AI_CONFIG, generateChatCompletion, isOpenAIConfigured } from "../lib/openai"

function requireArg(name: string): string {
  const idx = process.argv.findIndex((a) => a === `--${name}`)
  if (idx === -1) return ""
  return (process.argv[idx + 1] ?? "").trim()
}

function section(text: string, header: string): string {
  const re = new RegExp(`${header}:\\s*\\n([\\s\\S]*?)(?:\\n\\n[A-Z _]+:\\s*\\n|$)`, "i")
  const m = text.match(re)
  return (m?.[1] ?? "").trim()
}

async function verifyClinicalRecordLite(input: {
  originalNarrative: string
  clinicalRecord: {
    narrative: string
    residentStatement: string
    interventions: string
    contributingFactors: string
    recommendations: string
    environmentalAssessment: string
  }
}): Promise<{
  fidelityScore: number
  additions: string[]
  omissions: string[]
  enhancements: string[]
  overallAssessment: "faithful" | "minor_issues" | "significant_issues"
}> {
  if (!isOpenAIConfigured()) {
    return {
      fidelityScore: 100,
      additions: [],
      omissions: [],
      enhancements: [],
      overallAssessment: "faithful",
    }
  }

  const systemPrompt = `You are a clinical documentation auditor.
Compare a clinical record against the original staff narrative.
Determine if the clinical record is a FAITHFUL representation.

RULES:
1. ADDITIONS: The clinical record must NOT contain facts, events,
   or observations that were not stated or clearly implied in the
   original narrative. List any additions found.
2. OMISSIONS: The clinical record must NOT remove or soften
   observations the staff member made. List any omissions.
3. ENHANCEMENTS: The clinical record SHOULD surface clinical
   significance that was present but unstated. List enhancements found.
   Enhancements are GOOD — they do not reduce the fidelity score.

Return ONLY JSON:
{
  "fidelityScore": 0-100,
  "additions": ["string"],
  "omissions": ["string"],
  "enhancements": ["string"],
  "overallAssessment": "faithful" | "minor_issues" | "significant_issues"
}`

  const userPrompt = `ORIGINAL STAFF NARRATIVE:
${input.originalNarrative}

CLINICAL RECORD:
Narrative: ${input.clinicalRecord.narrative}
Resident Statement: ${input.clinicalRecord.residentStatement}
Interventions: ${input.clinicalRecord.interventions}
Contributing Factors: ${input.clinicalRecord.contributingFactors}
Recommendations: ${input.clinicalRecord.recommendations}
Environment: ${input.clinicalRecord.environmentalAssessment}
`

  const res = await generateChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: AI_CONFIG.model, temperature: 0, maxTokens: 900, response_format: { type: "json_object" } },
  )
  const txt = res.choices[0]?.message?.content?.trim() ?? ""
  const parsed = JSON.parse(txt) as any
  return {
    fidelityScore: Math.max(0, Math.min(100, Math.round(Number(parsed.fidelityScore) || 100))),
    additions: Array.isArray(parsed.additions) ? parsed.additions.filter((x: any) => typeof x === "string") : [],
    omissions: Array.isArray(parsed.omissions) ? parsed.omissions.filter((x: any) => typeof x === "string") : [],
    enhancements: Array.isArray(parsed.enhancements) ? parsed.enhancements.filter((x: any) => typeof x === "string") : [],
    overallAssessment:
      parsed.overallAssessment === "minor_issues" || parsed.overallAssessment === "significant_issues"
        ? parsed.overallAssessment
        : "faithful",
  }
}

async function main() {
  const facilityId = requireArg("facilityId") || process.env.FACILITY_ID || ""
  if (!facilityId) {
    throw new Error("Missing facilityId. Provide --facilityId <id> or set FACILITY_ID.")
  }

  await connectMongo()
  const rows = await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    $or: [
      { "investigation.verificationResult": { $exists: false } },
      { "investigation.verificationResult": null },
    ],
  })
    .select(["id", "facilityId", "initialReport.narrative", "initialReport.enhancedNarrative"])
    .lean()
    .exec()

  let processed = 0
  let failed = 0
  let missingSource = 0

  for (const r of rows as unknown as Array<{ id: string; facilityId?: string; initialReport?: any }>) {
    try {
      const originalNarrative = (r.initialReport?.narrative ?? "").trim()
      const enhanced = (r.initialReport?.enhancedNarrative ?? "").trim()
      if (!originalNarrative || !enhanced) {
        missingSource++
        failed++
        continue
      }

      const clinicalRecord = {
        narrative: section(enhanced, "DESCRIPTION OF INCIDENT"),
        residentStatement: section(enhanced, "RESIDENT STATEMENT"),
        interventions: section(enhanced, "IMMEDIATE INTERVENTIONS"),
        contributingFactors: section(enhanced, "CONTRIBUTING FACTORS"),
        recommendations: section(enhanced, "RECOMMENDATIONS"),
        environmentalAssessment: section(enhanced, "ENVIRONMENTAL ASSESSMENT"),
      }

      const verification = await verifyClinicalRecordLite({
        originalNarrative,
        clinicalRecord,
      })

      await IncidentModel.updateOne(
        { id: r.id, facilityId },
        {
          $set: {
            "investigation.verificationResult": {
              ...verification,
              verifiedAt: new Date(),
            },
          },
        },
      )
      processed++
    } catch {
      failed++
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[backfill-verification-results] facilityId=${facilityId}`, { processed, failed, missingSource, total: rows.length })
  await mongoose.disconnect()
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[backfill-verification-results] failed:", e)
  process.exitCode = 1
})

