# Task 38 — Incident-scoped vector search + staff per-incident intelligence API
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 3–4 hours
## Depends On: Task 37 (incident_answer_vectors collection populated with real documents)

---

## Why This Task Exists

Task 37 populates `incident_answer_vectors` with per-answer embeddings. This task makes them queryable by:

1. Defining the Atlas Vector Search index on `incident_answer_vectors` with `incidentId` as a pre-filter field.
2. Extending `lib/agents/vector-search.ts` to support `incidentId`-scoped queries against the new collection.
3. Creating a staff-accessible API route `/api/staff/incidents/[id]/intelligence` that accepts a natural-language question and returns an answer grounded only in that incident's vectorized Q&A.

---

## What This Task Creates / Modifies

### Atlas Vector Search index (manual operator step)

The human operator must create this index in the MongoDB Atlas UI **before this task's code will work in production**. Document the index definition clearly so it can be created without ambiguity.

**Index name:** `incident_answer_vectors_vector_index`  
**Collection:** `incident_answer_vectors`  
**Index type:** Vector Search  

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "vector",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "incidentId"
    },
    {
      "type": "filter",
      "path": "facilityId"
    }
  ]
}
```

> **Note for operator:** Create this index in the Atlas UI under Database → Collections → incident_answer_vectors → Search Indexes. The index will not be available until Atlas finishes building it (typically 1–5 minutes for a small collection).

### Modified: `lib/agents/vector-search.ts`

Add `incidentId?: string` to `SearchFilters`:

```ts
export interface SearchFilters {
  incidentType?: string
  dateFrom?: string
  dateTo?: string
  residentId?: string
  staffId?: string
  staffIds?: string[]
  phase?: string
  incidentId?: string   // NEW — scope to a single incident's answer vectors
}
```

Add a new exported function `searchIncidentAnswers`:

```ts
export async function searchIncidentAnswers(
  query: string,
  incidentId: string,
  facilityId: string,
  topK = 10,
): Promise<IncidentAnswerVectorDoc[]>
```

Implementation:
1. Generate a query vector using `text-embedding-3-small`.
2. Run Atlas `$vectorSearch` on `incident_answer_vectors` with `preFilter: { incidentId: { $eq: incidentId }, facilityId: { $eq: facilityId } }`.
3. Return the top-K matching answer documents with their `questionText`, `answerText`, `tier`, and `score`.

Fallback for dev (no Atlas): cosine similarity against all `incident_answer_vectors` documents for the `incidentId` (in-process, same pattern as existing `lib/agents/vector-search.ts` fallback).

### New route: `app/api/staff/incidents/[id]/intelligence/route.ts`

```
GET /api/staff/incidents/[id]/intelligence?question=...
```

- Auth: `isIncidentReporter(incident, user)` — 403 if not the reporter.
- Load incident from MongoDB; 404 if not found.
- Phase: available for any phase (staff can query while report is in progress).
- Extract `question` from query params; 400 if missing.
- Call `searchIncidentAnswers(question, incidentId, facilityId, 10)`.
- Build a prompt from the retrieved answer chunks:
  ```
  You are a clinical intelligence assistant. The following are recorded Q&A from an incident report.
  Answer the staff member's question using only the information in these records.
  If the answer is not in the records, say "I don't have enough information from this incident to answer that."

  Records:
  {retrieved chunks as Q: / A: pairs}

  Question: {question}
  Answer:
  ```
- Call OpenAI `gpt-4o-mini` (or the configured model from `lib/agents/intelligence-qa.ts` pattern).
- Return:
  ```json
  {
    "answer": "...",
    "citations": [
      { "questionText": "...", "answerText": "...", "tier": "tier1" },
      ...
    ],
    "incidentId": "...",
    "questionCount": 5
  }
  ```
- Graceful degradation: if `OPENAI_API_KEY` is not set, return a 200 with `answer: "Intelligence is not available in this environment."`.

---

## Success Criteria

- [ ] Atlas Vector Search index is defined and documented.
- [ ] `searchIncidentAnswers("was the resident injured?", incidentId, facilityId)` returns the most relevant Q&A pairs for that incident only (not Q&A from other incidents).
- [ ] `GET /api/staff/incidents/{id}/intelligence?question=was+the+resident+injured` returns a JSON response with `answer` and `citations`.
- [ ] A non-reporter cannot access the route (403).
- [ ] If the incident has no answer vectors yet (report in progress with no answers recorded in the new collection), the route returns a 200 with `answer: "No answers have been recorded for this incident yet."`.
- [ ] `npm run typecheck` and `npm run build` pass.

---

## Test Cases (manual)

```
TEST 1 — Per-incident query returns relevant answers
  Given: incident has 5 Tier 1 answers vectorized (task 37 done)
  When:  GET /api/staff/incidents/{id}/intelligence?question=was+there+a+witness
  Then:  answer references the "witnessed" Q&A from that incident only
  And:   citations array contains the matching questionText / answerText

TEST 2 — Cross-incident isolation
  Given: two incidents with different answers about witnesses
  When:  query is run against incident A
  Then:  answer references only incident A's Q&A, not incident B's

TEST 3 — No vectors yet
  Given: incident has no documents in incident_answer_vectors
  When:  intelligence query is made
  Then:  200 with "No answers have been recorded for this incident yet."

TEST 4 — Access control
  Given: different user (not reporter, not admin)
  When:  GET /api/staff/incidents/{id}/intelligence?question=...
  Then:  403

TEST 5 — Dev without Atlas
  Given: Atlas vector search not available (dev env)
  Then:  fallback cosine similarity returns results (or graceful empty)
```

---

## Implementation prompt

```
Phase 11 task 38: Incident-scoped vector search + staff intelligence API.

1. Add incidentId?: string to SearchFilters in lib/agents/vector-search.ts.
   Add searchIncidentAnswers(query, incidentId, facilityId, topK) function:
   - Generate query embedding (text-embedding-3-small)
   - Atlas $vectorSearch on incident_answer_vectors with preFilter { incidentId, facilityId }
   - Dev fallback: in-process cosine similarity against all docs for that incidentId
   - Return top-K answer docs with score

2. Create app/api/staff/incidents/[id]/intelligence/route.ts:
   - GET with ?question= param
   - Auth: isIncidentReporter check; 403 if not reporter
   - Call searchIncidentAnswers with the question
   - Build a RAG prompt with retrieved chunks
   - Call gpt-4o-mini (or configured model); return { answer, citations, incidentId }
   - Empty collection case: return "No answers recorded yet"
   - No API key case: return "Intelligence not available"

3. Document the Atlas Vector Search index definition clearly in this task file
   (already done above) so the operator can create it manually.

4. npm run typecheck and npm run build.
```

---

## Atlas index creation reminder

After deploying this task, the human operator must:
1. Go to MongoDB Atlas → your cluster → Collections → `incident_answer_vectors`.
2. Click "Search Indexes" → "Create Search Index".
3. Choose "JSON editor", name it `incident_answer_vectors_vector_index`.
4. Paste the index JSON from the "Atlas Vector Search index" section above.
5. Wait for the index to build (status changes from "Building" to "Active").

The staff intelligence route will return empty results until this index is active.

---

## Files to create / modify

| File | Change |
|------|--------|
| `lib/agents/vector-search.ts` | Add `incidentId` to `SearchFilters`; add `searchIncidentAnswers` function |
| `app/api/staff/incidents/[id]/intelligence/route.ts` | **New** — per-incident intelligence API for staff |
