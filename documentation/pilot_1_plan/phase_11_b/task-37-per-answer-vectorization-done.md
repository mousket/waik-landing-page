## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 4–5 hours
## Depends On: Phase 10 complete (answer flow stable)

---

## Why This Task Exists

The current embedding model generates one vector per incident at sign-off.
This means: no intelligence available while the report is in progress,
all answers compressed into a single point (no question-level retrieval),
and the in-memory cache does not survive server restarts.

This task introduces per-answer vectorization: every time a nurse records
an answer, a small embedding is generated for that Q&A pair and stored
in a dedicated MongoDB collection. Intelligence becomes available from
the first answer, not after sign-off.

**Key improvement over Cursor's version:** The embedding text includes
incident type, resident name, tier, and area hint — giving the vector
search dramatically better semantic context for both incident-scoped
and future cross-incident retrieval.

---

## What This Task Creates / Modifies

### New collection: `incident_answer_vectors`

```ts
{
  _id: ObjectId,
  incidentId: string,
  facilityId: string,
  questionId: string,           // "t1-q1", "t2-q3", "c-q1"
  questionText: string,
  answerText: string,
  tier: "tier1" | "tier2" | "closing",
  areaHint: string,             // "Narrative", "Environment", etc.
  incidentType: string,         // "fall", "medication_error", etc.
  residentName: string,         // for cross-incident context
  vector: number[],             // 1536-dim text-embedding-3-small
  embeddedAt: Date,
}
```

Compound unique index: `{ incidentId: 1, questionId: 1 }`

### New model: `backend/src/models/incident-answer-vector.model.ts`

Standard Mongoose schema matching the collection shape above.

### New service: `lib/agents/answer-embedding-service.ts`

```ts
export async function upsertAnswerEmbedding(params: {
  incidentId: string
  facilityId: string
  questionId: string
  questionText: string
  answerText: string
  tier: "tier1" | "tier2" | "closing"
  areaHint: string
  incidentType: string
  residentName: string
}): Promise<void>
```

Implementation:
1. Compose embedding text with FULL CONTEXT:
```
Incident Type: fall
Resident: Margaret Chen, Room 102
Tier: tier1 | Area: Narrative
Question: Tell us everything that happened.
Answer: I found Margaret on the floor next to her bed...
```
2. Call `generateEmbedding(text)` from `lib/openai.ts` (text-embedding-3-small)
3. Upsert to `incident_answer_vectors`:
   `updateOne({ incidentId, questionId }, { $set: { ...all fields, vector, embeddedAt } }, { upsert: true })`
4. If `OPENAI_API_KEY` not set: log warning, return early (graceful degradation)
5. Wrapped in try/catch — never throws. This is always fire-and-forget.

### Modified: `app/api/report/answer/route.ts`

At the end of the handler, after `saveReportSession` and `persistReportCheckpoint`:

```ts
void upsertAnswerEmbedding({
  incidentId: session.incidentId,
  facilityId: session.facilityId,
  questionId: body.questionId,
  questionText: body.questionText,   // ← MUST BE IN THE REQUEST BODY
  answerText: body.answer || body.transcript,
  tier: body.tier,                   // ← MUST BE IN THE REQUEST BODY
  areaHint: body.areaHint || "",     // ← MUST BE IN THE REQUEST BODY
  incidentType: session.incidentType,
  residentName: session.residentName,
}).catch(err => console.warn("[report/answer] Answer embedding failed:", err))
```

### Modified: `app/staff/report/page.tsx`

In `handleAnswer`, add `questionText`, `tier`, and `areaHint` to the
request body sent to `/api/report/answer`:

```ts
// CURRENT:
body: JSON.stringify({ sessionId, questionId, transcript, tier: activeQuestion.tier, activeMs })

// NEW — ADD:
body: JSON.stringify({
  sessionId,
  questionId: activeQuestion.id,
  transcript: transcript.trim(),
  tier: activeQuestion.tier,
  activeMs,
  questionText: activeQuestion.text,    // ← ADD THIS
  areaHint: activeQuestion.areaHint,    // ← ADD THIS
})
```

This is critical — without `questionText` in the body, the vectors
will have empty question text and retrieval quality will be poor.

---

## Success Criteria

- [ ] After a Tier 1 answer, a document appears in `incident_answer_vectors`
      with correct incidentId, questionId, questionText, answerText, vector,
      tier, areaHint, incidentType, and residentName
- [ ] After Tier 2 and closing answers, equivalent documents appear
- [ ] Upsert semantics: re-answering a question updates the existing document
- [ ] Embedding text includes incident type, resident, tier, and area hint
- [ ] `areaHint` is NEVER "undefined" in any stored document — Tier 2 answers
      use "Follow-up" or their gap category as the area hint fallback
- [ ] `generateEmbedding` verified or added in `lib/openai.ts` before use
- [ ] If OPENAI_API_KEY is not set, answer route still returns 200
- [ ] Answer route response time is not noticeably slower (fire-and-forget)
- [ ] `questionText`, `tier`, and `areaHint` are in the answer request body
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Tier 1 answer vectorized with full context
  Given: staff records Tier 1 answer for "Tell us everything that happened"
  When: /api/report/answer returns 200
  Then: incident_answer_vectors document contains:
        questionText: "Tell us everything that happened..."
        tier: "tier1"
        areaHint: "Narrative"
        incidentType: "fall"
        residentName: "Margaret Chen"
        vector: array of 1536 numbers
  Pass/Fail: ___

TEST 2 — Upsert on re-answer
  Given: staff previously answered t1-q1; answers it again
  Then: document count for (incidentId, t1-q1) remains 1; answerText updated
  Pass/Fail: ___

TEST 3 — Graceful degradation
  Given: OPENAI_API_KEY unset
  When: staff records any answer
  Then: /api/report/answer returns 200; warning logged; no error
  Pass/Fail: ___

TEST 4 — Fire-and-forget timing
  Given: staff records an answer
  Then: /api/report/answer responds in < 2s (embedding does not block)
  Pass/Fail: ___

TEST 5 — questionText is in the request body
  Given: staff answers a question
  When: network request is inspected
  Then: body contains questionText, tier, and areaHint fields
  Pass/Fail: ___
```

---

## Implementation Prompt

```
Phase 11 task 37: Per-answer vectorization.

═══════════════════════════════════════════════════════════
STEP 0 — VERIFY generateEmbedding export  [Gap 3 fix]
═══════════════════════════════════════════════════════════

BEFORE writing any embedding code, read lib/openai.ts and check for
a plain embedding function that just generates and returns a vector:

  export async function generateEmbedding(text: string): Promise<number[]>

Two possible outcomes:

  SCENARIO A — plain generateEmbedding already exists:
    Use it directly in answer-embedding-service.ts. No changes to lib/openai.ts.

  SCENARIO B — only generateAndStoreEmbedding (or equivalent high-level function) exists:
    Add this helper to lib/openai.ts before proceeding:
    ```ts
    export async function generateEmbedding(text: string): Promise<number[]> {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      })
      return response.data[0].embedding
    }
    ```
    Do NOT call generateAndStoreEmbedding — it does far more than generate a vector
    and is not appropriate for per-answer use.

Do not proceed to step 1 until generateEmbedding is confirmed or added.

═══════════════════════════════════════════════════════════
STEP 1 — Create Mongoose model
═══════════════════════════════════════════════════════════

Create backend/src/models/incident-answer-vector.model.ts:
Schema with incidentId, facilityId, questionId, questionText, answerText,
tier, areaHint, incidentType, residentName, vector ([Number]), embeddedAt.
Compound unique index on { incidentId: 1, questionId: 1 }.

═══════════════════════════════════════════════════════════
STEP 2 — Create answer-embedding-service.ts
═══════════════════════════════════════════════════════════

Create lib/agents/answer-embedding-service.ts:
upsertAnswerEmbedding function. Compose embedding text WITH FULL CONTEXT:
"Incident Type: {type}\nResident: {name}\nTier: {tier} | Area: {hint}\n
Question: {q}\nAnswer: {a}"

IMPORTANT — areaHint defensive fallback  [Gap 5 fix]:
  areaHint: params.areaHint || "General"
Never let "undefined" appear in the embedding text. Tier 2 questions are
dynamically generated and may not have areaHint set.

Call generateEmbedding from lib/openai.ts (confirmed in Step 0).
Upsert to collection. Graceful degradation if no API key. Never throws.

═══════════════════════════════════════════════════════════
STEP 3 — Modify app/api/report/answer/route.ts
═══════════════════════════════════════════════════════════

At end of handler, fire void upsertAnswerEmbedding({...}).catch(console.warn)
Pass: incidentId, facilityId, questionId, questionText (from body),
answerText, tier (from body), areaHint (from body), incidentType
(from session), residentName (from session).

═══════════════════════════════════════════════════════════
STEP 4 — Modify app/staff/report/page.tsx handleAnswer
═══════════════════════════════════════════════════════════

ADD questionText: activeQuestion.text and areaHint: activeQuestion.areaHint
to the request body sent to /api/report/answer.
These fields MUST be present or the vectors will have empty question text.

NOTE — areaHint on Tier 2 questions  [Gap 5 fix]:
Tier 2 questions are generated by the LLM and the PendingQuestion type
may not have areaHint. Check the type definition. If missing, add
  areaHint?: string
to the PendingQuestion interface (or wherever Tier 2 questions are typed).
Then update gap_questions.ts to populate areaHint from the gap category:
  areaHint: question.category ?? "Follow-up"
so that Tier 2 answer vectors get a meaningful area label.

═══════════════════════════════════════════════════════════
STEP 5 — Run checks
═══════════════════════════════════════════════════════════

npm run typecheck and npm run build.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `lib/openai.ts` | Verify or add `generateEmbedding(text): Promise<number[]>` export |
| `backend/src/models/incident-answer-vector.model.ts` | **New** — Mongoose schema |
| `lib/agents/answer-embedding-service.ts` | **New** — per-answer embedding service; areaHint fallback |
| `app/api/report/answer/route.ts` | Fire background upsertAnswerEmbedding |
| `app/staff/report/page.tsx` | Add questionText, areaHint to answer request body |
| `lib/agents/expert_investigator/gap_questions.ts` | Add areaHint population on Tier 2 questions |

---
---
---

