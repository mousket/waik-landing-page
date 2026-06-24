## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 3–4 hours
## Depends On: Task 37 (incident_answer_vectors populated)

---

## Why This Task Exists

Task 37 populates `incident_answer_vectors` with per-answer embeddings.
This task makes them queryable: Atlas Vector Search index definition,
an `incidentId`-scoped search function, and a staff-accessible API route
that answers questions grounded in a single incident's Q&A.

**Key improvement over Cursor's version:** The search function includes
a try/catch with a clear error message if the Atlas index does not exist,
preventing cryptic MongoDB errors during deployment.

---

## What This Task Creates / Modifies

### Atlas Vector Search Index (MANUAL operator step)

**This must be created in the MongoDB Atlas UI before task 38 queries work.**

Index name: `incident_answer_vectors_vector_index`
Collection: `incident_answer_vectors`

```json
{
  "fields": [
    { "type": "vector", "path": "vector", "numDimensions": 1536, "similarity": "cosine" },
    { "type": "filter", "path": "incidentId" },
    { "type": "filter", "path": "facilityId" }
  ]
}
```

Create in: Atlas UI → Database → Collections → incident_answer_vectors →
Search Indexes → Create Search Index → JSON editor.

### Modified: `lib/agents/vector-search.ts`

Add `incidentId?: string` to `SearchFilters`.

New exported function:

```ts
export async function searchIncidentAnswers(
  query: string,
  incidentId: string,
  facilityId: string,
  topK: number = 10
): Promise<Array<{
  questionText: string
  answerText: string
  tier: string
  areaHint: string
  score: number
}>>
```

Implementation:
1. Generate query embedding via `generateEmbedding(query)`
2. Try Atlas `$vectorSearch`:
   ```
   $vectorSearch: {
     index: "incident_answer_vectors_vector_index",
     path: "vector",
     queryVector: queryEmbedding,
     numCandidates: topK * 10,
     limit: topK,
     filter: { incidentId: { $eq: incidentId }, facilityId: { $eq: facilityId } }
   }
   ```
3. **Atlas index error handling:** Wrap in try/catch. If the error
   contains "index not found" or similar, log:
   `"[vector-search] Atlas index 'incident_answer_vectors_vector_index' not found. Create it in Atlas UI. Falling back to in-process cosine."`
   Then fall through to the fallback.
4. Fallback (dev or Atlas unavailable): load all `incident_answer_vectors`
   for this incidentId, compute cosine similarity in-process, sort and
   return top-K.
5. Return array of { questionText, answerText, tier, areaHint, score }.

### New route: `app/api/staff/incidents/[id]/intelligence/route.ts`

```
POST /api/staff/incidents/[id]/intelligence
Body: {
  question: string
  conversationHistory?: Array<{ question: string; answer: string }>
}
```

> **Gap 2 fix — conversation history:** The route is POST (not GET) so that
> `conversationHistory` can be sent in the request body. Without this, follow-up
> questions like "What did the witness say?" have no context from the prior turn
> and the LLM will produce generic or wrong answers. The client (task 39) sends
> the full conversation array with every request.

Server behavior:
1. Auth: `getCurrentUser()`. Must be the incident reporter — 403 if not.
   (Use the same `isIncidentReporter` check as other staff routes.)
2. Load incident from MongoDB. 404 if not found.
3. Extract `question` and `conversationHistory` from the request body. 400 if question missing.
4. Call `searchIncidentAnswers(question, incidentId, facilityId, 10)`.
5. If no results (empty collection): return 200 with
   `{ answer: "No answers have been recorded for this incident yet. As you complete the report, intelligence will become available." }`
6. Build RAG prompt — include conversation history BEFORE the question:
   ```
   You are a clinical intelligence assistant for senior care.
   Below are recorded Q&A from an incident report.
   Answer the staff member's question using ONLY the information below.
   If the answer is not in the records, say "I don't have enough
   information from this incident to answer that."

   Incident records:
   [Tier 1 | Narrative] Q: Tell us everything that happened.
   A: I found Margaret on the floor...

   [Tier 2 | Environment] Q: Describe the floor conditions.
   A: The floor was dry but dimly lit...

   {if conversationHistory.length > 0:}
   Prior conversation:
   Q: {history[0].question}
   A: {history[0].answer}
   Q: {history[1].question}
   A: {history[1].answer}
   ...

   New question: {question}
   ```
   Include up to the last 4 conversation turns (to avoid prompt length issues).
7. Call LLM (gpt-4o-mini or configured model, temperature 0.3, max_tokens 500)
8. Return:
   ```json
   {
     "answer": "...",
     "citations": [
       { "questionText": "...", "answerText": "...", "tier": "tier1", "areaHint": "Narrative", "score": 0.89 }
     ],
     "incidentId": "...",
     "questionCount": 10
   }
   ```
9. If OPENAI_API_KEY not set: return 200 with
   `{ answer: "Intelligence is not available in this environment." }`

---

## Success Criteria

- [ ] `searchIncidentAnswers` returns relevant Q&A for one incident only
- [ ] Cross-incident isolation: results from incident A never include B's data
- [ ] POST route returns answer + citations for a valid question
- [ ] Empty collection returns helpful message (not an error)
- [ ] Non-reporter gets 403
- [ ] Atlas index missing: clear log message + graceful fallback
- [ ] Dev without Atlas: in-process cosine fallback works
- [ ] Conversation history in request body is included in the RAG prompt
- [ ] Follow-up questions referencing prior answers produce contextually correct responses
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Per-incident query returns relevant answers
  Given: incident has 5 Tier 1 answers vectorized (task 37 done)
  When:  POST /api/staff/incidents/{id}/intelligence { question: "was there a witness?" }
  Then:  answer references the "witnessed" Q&A from that incident only
  And:   citations array contains the matching questionText / answerText
  Pass/Fail: ___

TEST 2 — Cross-incident isolation
  Given: two incidents with different answers about witnesses
  When:  query is run against incident A
  Then:  answer references only incident A's Q&A, not incident B's
  Pass/Fail: ___

TEST 3 — Conversation history enables follow-ups  [Gap 2 fix]
  Given: conversationHistory = [{ question: "Was resident injured?", answer: "Yes, minor laceration." }]
  When:  POST with question: "Who treated her?"
  Then:  answer correctly refers to the resident from the prior turn
         (not a generic response)
  Pass/Fail: ___

TEST 4 — No vectors yet
  Given: incident has no documents in incident_answer_vectors
  When:  intelligence query is made
  Then:  200 with "No answers have been recorded for this incident yet."
  Pass/Fail: ___

TEST 5 — Access control
  Given: different user (not reporter, not admin)
  When:  POST /api/staff/incidents/{id}/intelligence
  Then:  403
  Pass/Fail: ___

TEST 6 — Dev without Atlas
  Given: Atlas vector search not available (dev env)
  Then:  fallback cosine similarity returns results (or graceful empty)
  Pass/Fail: ___
```

---

## Implementation Prompt

```
Phase 11 task 38: Incident-scoped vector search + staff intelligence API.

1. Add incidentId?: string to SearchFilters in lib/agents/vector-search.ts.

2. Add searchIncidentAnswers(query, incidentId, facilityId, topK) function:
   - Generate query embedding
   - Try Atlas $vectorSearch with preFilter { incidentId, facilityId }
   - CATCH: if error mentions "index not found", log clear message naming
     the missing index ("incident_answer_vectors_vector_index"), fall through
   - Fallback: in-process cosine against all docs for that incidentId
   - Return top-K with questionText, answerText, tier, areaHint, score

3. Create app/api/staff/incidents/[id]/intelligence/route.ts:
   - POST route (NOT GET) — accepts { question, conversationHistory? } in body  [Gap 2 fix]
   - Auth: isIncidentReporter; 403 if not
   - Call searchIncidentAnswers
   - Build RAG prompt:
     * First: the incident records (top-K citations)
     * Then: prior conversation history (last 4 turns max) if provided
     * Then: "New question: {question}"
   - Call LLM; return { answer, citations, incidentId }
   - Empty case: "No answers recorded yet"
   - No API key: "Intelligence not available"

4. npm run typecheck and npm run build.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `lib/agents/vector-search.ts` | Add incidentId to SearchFilters; add searchIncidentAnswers |
| `app/api/staff/incidents/[id]/intelligence/route.ts` | **New** — per-incident intelligence API |

---
---
---

