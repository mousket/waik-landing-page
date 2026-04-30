# Task IR-2a — Embedding Generation at Sign-Off
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 2–3 hours
## Depends On: Phase IR-1 complete (POST /api/report/complete working)

---

## Why This Task Exists

Every signed incident must become searchable across the facility.
The current system embeds individual Q&A pairs in process memory —
which does not survive restarts, does not persist, and cannot search
across incidents. This task creates a persistent embedding service
that generates a single 1536-dimension vector per incident at sign-off
and stores it directly on the MongoDB incident document.

This is the foundation for facility-wide intelligence queries like
"what are the most common fall locations this month?" and "which
residents have had repeated incidents?"

---

## What This Task Creates

1. `lib/agents/embedding-service.ts` — embedding generation + MongoDB storage

## What This Task Modifies

2. `app/api/report/complete/route.ts` — call embedding service after sign-off write
3. `backend/src/models/incident.model.ts` — add embedding field

---

## Context Files

- `lib/openai.ts` — generateEmbedding function (already exists)
- `lib/embeddings.ts` — existing in-process embedding cache (reference, not reused)
- `blueprint/WAiK_Incident_Reporting_Blueprint.md` — Section 6, Layer 1

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] IncidentModel has new field: `embedding: [Number]` (1536 dimensions)
- [ ] After POST /api/report/complete, the incident has a non-null embedding
- [ ] Embedding is generated from: clinical record sections concatenated
- [ ] Embedding uses text-embedding-3-small model (existing AI_CONFIG.embeddingModel)
- [ ] Embedding generation is non-blocking — if it fails, sign-off still succeeds
- [ ] Embedding can be regenerated for existing incidents via a utility function
- [ ] MongoDB index created for vector search (if Atlas supports it)

---

## Test Cases

```
TEST 1 — Embedding generated on sign-off
  Action: Complete a full incident report (all phases through sign-off)
  Verify: MongoDB incident document has embedding field
          with array of 1536 numbers
  Pass/Fail: ___

TEST 2 — Embedding failure does not block sign-off
  Action: Set OPENAI_API_KEY to invalid value, complete a report
  Expected: Report completes successfully, embedding is null
           Console log shows warning about embedding failure
  Pass/Fail: ___

TEST 3 — Embedding content includes clinical record
  Action: Complete a report, read the embedded text
  Expected: The text sent to the embedding model contains the
           clinical record sections (narrative, interventions, etc.)
  Pass/Fail: ___

TEST 4 — Regenerate embedding for existing incident
  Action: Call generateAndStoreEmbedding(incidentId, facilityId)
  Expected: Incident embedding field updated
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am adding persistent embedding generation to WAiK's incident
reporting system. Every signed incident gets a searchable vector
stored directly on the MongoDB document.

REFERENCE: Blueprint Section 6, Layer 1 (Incident-Level Embedding).

═══════════════════════════════════════════════════════════
PART A — ADD EMBEDDING FIELD TO INCIDENT MODEL
═══════════════════════════════════════════════════════════

In backend/src/models/incident.model.ts, add to the schema:

  embedding: {
    type: [Number],
    default: null,
    select: false,   // do not return in normal queries (large field)
  },

This stores a 1536-dimension float array.

Do NOT add a MongoDB index yet — we will add the vector search
index in task IR-2b. Just add the field.

═══════════════════════════════════════════════════════════
PART B — CREATE lib/agents/embedding-service.ts
═══════════════════════════════════════════════════════════

import { generateEmbedding } from "@/lib/openai"
// generateEmbedding already exists in lib/openai.ts and calls
// openai.embeddings.create with text-embedding-3-small

interface IncidentEmbeddingInput {
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

export async function generateAndStoreEmbedding(
  input: IncidentEmbeddingInput
): Promise<void> {
  try {
    // Compose text for embedding
    // Include both clinical content and metadata for better retrieval
    const embeddingText = [
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

    // Generate embedding vector
    const embedding = await generateEmbedding(embeddingText)

    // Store on incident document
    // Dynamic import to avoid build-time connection
    const { IncidentModel } = await import("@/backend/src/models/incident.model")
    await IncidentModel.updateOne(
      { id: input.incidentId, facilityId: input.facilityId },
      { $set: { embedding } }
    )

    console.log(`[embedding-service] Stored embedding for incident ${input.incidentId} (${embedding.length} dims)`)
  } catch (error) {
    console.error(`[embedding-service] Failed to generate embedding for ${input.incidentId}:`, error)
    // Non-blocking — do not throw
  }
}

// Utility: regenerate embeddings for all incidents in a facility
// Used for backfill when first deploying this feature
export async function backfillFacilityEmbeddings(
  facilityId: string
): Promise<{ processed: number; failed: number }> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const incidents = await IncidentModel.find({
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    embedding: null,
  }).select("id facilityId initialReport investigation incidentType residentName residentRoom location incidentDate").lean()

  let processed = 0
  let failed = 0

  for (const inc of incidents) {
    try {
      await generateAndStoreEmbedding({
        incidentId: inc.id,
        facilityId: inc.facilityId || facilityId,
        clinicalRecord: {
          narrative: inc.initialReport?.enhancedNarrative || inc.description || "",
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
          incidentDate: inc.incidentDate?.toISOString() || "",
        },
      })
      processed++
    } catch {
      failed++
    }
  }

  return { processed, failed }
}

═══════════════════════════════════════════════════════════
PART C — INTEGRATE INTO POST /api/report/complete
═══════════════════════════════════════════════════════════

In app/api/report/complete/route.ts, AFTER the main MongoDB write
and BEFORE deleting the Redis session, add:

import { generateAndStoreEmbedding } from "@/lib/agents/embedding-service"

// Step 7.5: Generate and store embedding (non-blocking)
generateAndStoreEmbedding({
  incidentId: session.incidentId,
  facilityId: session.facilityId,
  clinicalRecord,
  metadata: {
    incidentType: session.incidentType,
    residentName: session.residentName,
    residentRoom: session.residentRoom,
    location: session.location,
    incidentDate: session.startedAt,
  },
}).catch(err => {
  console.error("[report/complete] Embedding generation failed:", err)
})
// Note: fire-and-forget — do not await in the main request path

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR2/task-IR-2a-DONE.md`
