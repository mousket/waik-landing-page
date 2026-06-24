# Task 37 — Per-answer vectorization + `incident_answer_vectors` collection
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 4–5 hours
## Depends On: Phase 9 (report answer route stable), Phase 10 (answer flow stable)

---

## Why This Task Exists

The current embedding model generates **one vector per incident** at sign-off using the full enhanced narrative. This means:
- No vector exists while the report is in progress (no intelligence available during Phase 1).
- All answers are compressed into a single point — individual question retrieval is impossible.
- The `lib/embeddings.ts` in-memory cache doesn't survive server restarts.

This task introduces **per-answer vectorization**: every time a staff member records an answer (Tier 1, Tier 2, or closing), a small embedding is generated for that `questionText + answerText` pair and stored in a dedicated MongoDB collection (`incident_answer_vectors`). This enables:
- Incident-scoped intelligent retrieval (task 38).
- Cross-incident retrieval at the question level (future).
- Intelligence available while the report is still in progress.

---

## What This Task Creates / Modifies

### New collection: `incident_answer_vectors`

Each document in this collection represents one answered question:

```ts
{
  _id: ObjectId,
  incidentId: string,          // matches Incident.id
  facilityId: string,
  questionId: string,          // e.g. "t1-q1", "t2-q3", "c-q1"
  questionText: string,
  answerText: string,
  tier: "tier1" | "tier2" | "closing",
  vector: number[],            // 1536-dim OpenAI text-embedding-3-small
  embeddedAt: Date,
}
```

**MongoDB index:** Create a compound index on `{ incidentId: 1, questionId: 1 }` (unique) for upserts.  
**Atlas Vector Search index:** See task 38 — this collection is the target. Document the index definition in task 38.

### New file: `lib/agents/answer-embedding-service.ts`

```ts
export async function upsertAnswerEmbedding(params: {
  incidentId: string
  facilityId: string
  questionId: string
  questionText: string
  answerText: string
  tier: "tier1" | "tier2" | "closing"
}): Promise<void>
```

Implementation:
1. Compose embedding text: `"Question: {questionText}\nAnswer: {answerText}"`.
2. Call OpenAI `text-embedding-3-small` to generate the vector.
3. Upsert into `incident_answer_vectors` using `updateOne({ incidentId, questionId }, { $set: { ...fields, vector, embeddedAt: new Date() } }, { upsert: true })`.
4. If `OPENAI_API_KEY` is not set, log a warning and return early (graceful degradation).
5. Wrap in try/catch; never throw — this is always called as a background side-effect.

### New Mongoose model: `backend/src/models/incident-answer-vector.model.ts`

```ts
const IncidentAnswerVectorSchema = new Schema({
  incidentId: { type: String, required: true, index: true },
  facilityId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  tier: { type: String, enum: ["tier1", "tier2", "closing"], required: true },
  vector: { type: [Number], required: true },
  embeddedAt: { type: Date, default: Date.now },
})

IncidentAnswerVectorSchema.index({ incidentId: 1, questionId: 1 }, { unique: true })
```

### Modified: `app/api/report/answer/route.ts`

At the end of the route handler, after the existing `saveReportSession` and `persistReportCheckpoint` calls, add a **fire-and-forget** call to `upsertAnswerEmbedding`:

```ts
// Background: vectorize this answer for incident-scoped intelligence
void upsertAnswerEmbedding({
  incidentId: session.incidentId,
  facilityId: session.facilityId,
  questionId: body.questionId,           // already present in the answer request body
  questionText: body.questionText ?? "", // add to answer request body if not already present
  answerText: body.answer,
  tier: body.tier ?? "tier1",            // add tier to answer request body if not present
}).catch((err) => console.warn("[report/answer] Answer embedding failed:", err))
```

If `questionText` and `tier` are not already present in the answer request body, add them. Check `app/api/report/answer/route.ts` and the client-side `handleAnswer` function in `app/staff/report/page.tsx` to see the current request shape.

---

## Success Criteria

- [ ] After a staff member records a Tier 1 answer, a document appears in `incident_answer_vectors` with the correct `incidentId`, `questionId`, `questionText`, `answerText`, and `vector`.
- [ ] After recording a Tier 2 answer and a closing answer, equivalent documents appear.
- [ ] Upsert semantics: recording the same question again (edit) updates the existing document rather than inserting a duplicate.
- [ ] If `OPENAI_API_KEY` is not set, the answer route still returns 200 (embedding silently skipped).
- [ ] The answer route response time is not noticeably slower (embedding is fire-and-forget).
- [ ] `npm run typecheck` and `npm run build` pass.

---

## Test Cases (manual)

```
TEST 1 — Tier 1 answer vectorized
  Given: OPENAI_API_KEY set; staff records Tier 1 answer
  When:  /api/report/answer returns 200
  Then:  incident_answer_vectors has a document with:
         incidentId matches, questionId matches, vector has 1536 elements

TEST 2 — Tier 2 answer vectorized
  Given: staff records a Tier 2 answer
  When:  /api/report/answer returns 200
  Then:  incident_answer_vectors has a document with tier: "tier2"

TEST 3 — Upsert on re-answer
  Given: staff previously answered t1-q1; answers it again
  Then:  document count for (incidentId, t1-q1) remains 1; answerText updated

TEST 4 — Graceful degradation (no API key)
  Given: OPENAI_API_KEY unset
  When:  staff records any answer
  Then:  /api/report/answer returns 200; no error thrown; warning logged

TEST 5 — Fire-and-forget timing
  Given: staff records an answer
  Then:  /api/report/answer responds in < 2s (embedding does not block response)
```

---

## Implementation prompt

```
Phase 11 task 37: Per-answer vectorization.

1. Create backend/src/models/incident-answer-vector.model.ts with the schema above.
   Compound unique index on { incidentId, questionId }.

2. Create lib/agents/answer-embedding-service.ts with upsertAnswerEmbedding().
   Compose "Question: {q}\nAnswer: {a}" text, call text-embedding-3-small,
   upsert into incident_answer_vectors. Graceful degradation if no API key.
   Always wrap in try/catch; never throw.

3. Modify app/api/report/answer/route.ts to fire upsertAnswerEmbedding as a
   background void call at the end of the handler (after saveReportSession +
   persistReportCheckpoint). Pass incidentId, facilityId, questionId, questionText,
   answerText, tier from the request body.

4. If questionText and tier are not in the answer request body, add them:
   - Check app/staff/report/page.tsx handleAnswer to see current body shape
   - Extend the body type and the client call if needed
   - Make questionText and tier optional with fallback to "" and "tier1"

5. npm run typecheck and npm run build.
```

---

## Files to create / modify

| File | Change |
|------|--------|
| `backend/src/models/incident-answer-vector.model.ts` | **New** — Mongoose schema |
| `lib/agents/answer-embedding-service.ts` | **New** — upsertAnswerEmbedding helper |
| `app/api/report/answer/route.ts` | Fire background upsertAnswerEmbedding |
| `app/staff/report/page.tsx` | Add `questionText`, `tier` to answer request body if missing |
