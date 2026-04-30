import { generateEmbedding } from "@/lib/openai"

export interface IncidentEmbeddingInput {
  incidentId: string
  facilityId: string
  clinicalRecord: {
    narrative: string
    residentStatement: string
    interventions: string
    contributingFactors: string
    recommendations: string
    environmentalAssessment: string
  }
  metadata: {
    incidentType: string
    residentName: string
    residentRoom: string
    location: string
    incidentDate: string
  }
}

function composeEmbeddingText(input: IncidentEmbeddingInput): string {
  return [
    `Incident Type: ${input.metadata.incidentType}`,
    `Resident: ${input.metadata.residentName}, Room ${input.metadata.residentRoom}`,
    `Location: ${input.metadata.location}`,
    `Date: ${input.metadata.incidentDate}`,
    "",
    "DESCRIPTION:",
    input.clinicalRecord.narrative,
    "",
    "RESIDENT STATEMENT:",
    input.clinicalRecord.residentStatement,
    "",
    "INTERVENTIONS:",
    input.clinicalRecord.interventions,
    "",
    "CONTRIBUTING FACTORS:",
    input.clinicalRecord.contributingFactors,
    "",
    "RECOMMENDATIONS:",
    input.clinicalRecord.recommendations,
    "",
    "ENVIRONMENT:",
    input.clinicalRecord.environmentalAssessment,
  ].join("\n")
}

/**
 * Core path: generates embedding and persists it. Returns false on failure (logs internally).
 */
async function tryPersistEmbedding(input: IncidentEmbeddingInput): Promise<boolean> {
  try {
    const embeddingText = composeEmbeddingText(input)
    const embedding = await generateEmbedding(embeddingText)
    const { IncidentModel } = await import("@/backend/src/models/incident.model")
    const res = await IncidentModel.updateOne(
      { id: input.incidentId, facilityId: input.facilityId },
      { $set: { embedding } },
    )
    if (res.matchedCount === 0) {
      console.warn(
        `[embedding-service] No incident matched id=${input.incidentId} facilityId=${input.facilityId}`,
      )
      return false
    }
    console.log(
      `[embedding-service] Stored embedding for incident ${input.incidentId} (${embedding.length} dims)`,
    )
    return true
  } catch (error) {
    console.warn(`[embedding-service] Failed to generate embedding for ${input.incidentId}:`, error)
    return false
  }
}

/**
 * Persist embedding from known clinical sections + metadata. Does not throw (sign-off must succeed).
 */
export async function generateAndStoreEmbedding(input: IncidentEmbeddingInput): Promise<void> {
  await tryPersistEmbedding(input)
}

type LeanIncidentForBackfill = {
  id: string
  facilityId?: string
  description?: string
  incidentType?: string
  residentName?: string
  residentRoom?: string
  location?: string
  incidentDate?: Date
  initialReport?: {
    narrative?: string
    enhancedNarrative?: string
    environmentNotes?: string
    immediateIntervention?: { action?: string }
  }
  investigation?: {
    contributingFactors?: string[]
    permanentIntervention?: { carePlanUpdate?: string }
  }
  phase2Sections?: {
    contributingFactors?: { factors?: string[] }
  }
  humanReport?: { recommendations?: string }
}

export function embeddingInputFromIncidentDoc(
  inc: LeanIncidentForBackfill,
  facilityId: string,
): IncidentEmbeddingInput {
  const ir = inc.initialReport
  const narrative =
    ir?.enhancedNarrative?.trim() ||
    ir?.narrative?.trim() ||
    (inc.description ?? "").trim() ||
    ""
  const contrib =
    inc.investigation?.contributingFactors?.filter(Boolean).join(", ") ||
    inc.phase2Sections?.contributingFactors?.factors?.filter(Boolean).join(", ") ||
    ""
  const recommendations =
    inc.investigation?.permanentIntervention?.carePlanUpdate?.trim() ||
    inc.humanReport?.recommendations?.trim() ||
    ""

  return {
    incidentId: inc.id,
    facilityId: inc.facilityId || facilityId,
    clinicalRecord: {
      narrative,
      residentStatement: "",
      interventions: ir?.immediateIntervention?.action?.trim() || "",
      contributingFactors: contrib,
      recommendations,
      environmentalAssessment: ir?.environmentNotes?.trim() || "",
    },
    metadata: {
      incidentType: inc.incidentType || "unknown",
      residentName: inc.residentName || "",
      residentRoom: inc.residentRoom || "",
      location: inc.location || "",
      incidentDate: inc.incidentDate instanceof Date ? inc.incidentDate.toISOString() : "",
    },
  }
}

/** Regenerate embedding for an existing incident (e.g. backfill / repair). Does not throw. */
export async function regenerateIncidentEmbedding(incidentId: string, facilityId: string): Promise<void> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")
  const doc = await IncidentModel.findOne({ id: incidentId, facilityId })
    .select([
      "id",
      "facilityId",
      "description",
      "incidentType",
      "residentName",
      "residentRoom",
      "location",
      "incidentDate",
      "initialReport",
      "investigation",
      "phase2Sections",
      "humanReport",
    ])
    .lean()
    .exec()

  if (!doc || typeof doc !== "object" || !("id" in doc && (doc as { id?: string }).id)) {
    console.warn(`[embedding-service] regenerateIncidentEmbedding: incident not found ${incidentId}`)
    return
  }

  await tryPersistEmbedding(
    embeddingInputFromIncidentDoc(doc as unknown as LeanIncidentForBackfill, facilityId),
  )
}

export async function backfillFacilityEmbeddings(
  facilityId: string,
): Promise<{ processed: number; failed: number }> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

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
      "initialReport",
      "investigation",
      "phase2Sections",
      "humanReport",
    ])
    .lean()

  let processed = 0
  let failed = 0

  for (const inc of incidents) {
    const input = embeddingInputFromIncidentDoc(inc as unknown as LeanIncidentForBackfill, facilityId)
    const ok = await tryPersistEmbedding(input)
    if (ok) processed++
    else failed++
  }

  return { processed, failed }
}
