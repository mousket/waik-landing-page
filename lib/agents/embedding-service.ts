/**
 * Embedding Service — IR-2a
 *
 * Generates a single ~1536-dim vector per incident at sign-off and stores
 * it directly on the MongoDB incident document. Foundation for facility-wide
 * intelligence queries (Blueprint Section 6, Layer 1).
 *
 * All operations here are best-effort; callers should fire-and-forget so
 * embedding failures never block the user-facing sign-off path.
 */

import IncidentModel from "@/backend/src/models/incident.model"
import connectMongo from "@/backend/src/lib/mongodb"
import { generateEmbedding } from "@/lib/openai"

export interface IncidentEmbeddingClinicalRecord {
  narrative: string
  residentStatement: string
  interventions: string
  contributingFactors: string
  recommendations: string
  environmentalAssessment: string
}

export interface IncidentEmbeddingMetadata {
  incidentType: string
  residentName: string
  residentRoom: string
  location: string
  incidentDate: string
}

export interface IncidentEmbeddingInput {
  incidentId: string
  facilityId: string
  clinicalRecord: IncidentEmbeddingClinicalRecord
  metadata: IncidentEmbeddingMetadata
}

export function buildEmbeddingText(input: IncidentEmbeddingInput): string {
  const { metadata, clinicalRecord } = input
  return [
    `Incident Type: ${metadata.incidentType}`,
    `Resident: ${metadata.residentName}, Room ${metadata.residentRoom}`,
    `Location: ${metadata.location}`,
    `Date: ${metadata.incidentDate}`,
    "",
    "DESCRIPTION:",
    clinicalRecord.narrative,
    "",
    "RESIDENT STATEMENT:",
    clinicalRecord.residentStatement,
    "",
    "INTERVENTIONS:",
    clinicalRecord.interventions,
    "",
    "CONTRIBUTING FACTORS:",
    clinicalRecord.contributingFactors,
    "",
    "RECOMMENDATIONS:",
    clinicalRecord.recommendations,
    "",
    "ENVIRONMENT:",
    clinicalRecord.environmentalAssessment,
  ].join("\n")
}

/**
 * Generate an embedding for the given incident and persist it on the
 * MongoDB document. Non-blocking by contract: never throws.
 */
export async function generateAndStoreEmbedding(
  input: IncidentEmbeddingInput,
): Promise<void> {
  try {
    const text = buildEmbeddingText(input)
    const embedding = await generateEmbedding(text)

    await connectMongo()
    await IncidentModel.updateOne(
      { id: input.incidentId, facilityId: input.facilityId },
      { $set: { embedding } },
    )

    console.log(
      `[embedding-service] Stored embedding for incident ${input.incidentId} (${embedding.length} dims)`,
    )
  } catch (error) {
    console.error(
      `[embedding-service] Failed to generate embedding for ${input.incidentId}:`,
      error,
    )
    // Non-blocking — never throw to caller.
  }
}

/**
 * Backfill utility: regenerate embeddings for incidents in a facility that
 * do not yet have one. Pulls minimal fields and reuses the same composer.
 */
export async function backfillFacilityEmbeddings(
  facilityId: string,
): Promise<{ processed: number; failed: number }> {
  await connectMongo()

  const incidents = await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    embedding: null,
  })
    .select(
      "id facilityId initialReport incidentType residentName residentRoom location incidentDate description",
    )
    .lean<
      Array<{
        id: string
        facilityId?: string
        incidentType?: string
        residentName?: string
        residentRoom?: string
        location?: string
        incidentDate?: Date
        description?: string
        initialReport?: {
          enhancedNarrative?: string
          narrative?: string
          environmentNotes?: string
          immediateIntervention?: { action?: string }
        }
      }>
    >()

  let processed = 0
  let failed = 0

  for (const inc of incidents) {
    try {
      await generateAndStoreEmbedding({
        incidentId: inc.id,
        facilityId: inc.facilityId || facilityId,
        clinicalRecord: {
          narrative:
            inc.initialReport?.enhancedNarrative ||
            inc.initialReport?.narrative ||
            inc.description ||
            "",
          residentStatement: "",
          interventions: inc.initialReport?.immediateIntervention?.action || "",
          contributingFactors: "",
          recommendations: "",
          environmentalAssessment: inc.initialReport?.environmentNotes || "",
        },
        metadata: {
          incidentType: inc.incidentType || "unknown",
          residentName: inc.residentName || "",
          residentRoom: inc.residentRoom || "",
          location: inc.location || "",
          incidentDate: inc.incidentDate
            ? new Date(inc.incidentDate).toISOString()
            : "",
        },
      })
      processed++
    } catch {
      failed++
    }
  }

  return { processed, failed }
}
