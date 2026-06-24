# Phase 11-B — Gap Analysis & Proposed Fixes

**Created:** 2026-06-06  
**Author:** Agent review pass  
**Status:** OPEN — gaps must be resolved before implementation begins

This document lists every gap identified during a review of the phase_11_b task files. Each entry includes the severity, the exact problem, which task and file it affects, and the concrete fix to apply.

---

## Severity key

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Will cause a TypeScript build failure or a broken feature in production |
| **FUNCTIONAL** | Code will compile but the feature will not work as designed |
| **MINOR** | Edge case, missing detail, or documentation gap — low risk |

---

## Gap 1 — `ReportSession` TypeScript type missing `generatedClinicalRecord`

**Severity:** CRITICAL — TypeScript build will fail  
**Affects:** Task 34, `app/api/report/preview/route.ts`  
**File:** `lib/config/report-session.ts` (the `ReportSession` interface)

### Problem

Task 34's preview route assigns:
```ts
session.generatedClinicalRecord = clinicalRecord
```

The `ReportSession` interface does not have a `generatedClinicalRecord` field. TypeScript will reject this property assignment with a type error and `npm run build` will fail.

### Fix

Add the field to the `ReportSession` interface in `lib/config/report-session.ts`:

```ts
// In the ReportSession interface
generatedClinicalRecord?: {
  narrative: string
  residentStatement: string
  interventions: string
  contributingFactors: string
  recommendations: string
  environmentalAssessment: string
} | null
```

Also add `reportPhase?: string` if it is not already on the interface (the preview route sets `session.reportPhase = "clinical_preview"`).

**Task 34 must add `lib/config/report-session.ts` to its "Files to create / modify" list.**

---

## Gap 2 — Conversation history not passed to the intelligence API

**Severity:** FUNCTIONAL — conversation follow-up questions will have no context  
**Affects:** Task 38 (`/api/staff/incidents/[id]/intelligence`), Task 39 (Intelligence tab)

### Problem

Task 39 maintains a `conversation` array client-side. But the API route only accepts a single `?question=` query param — no prior conversation context is sent to the LLM.

When a nurse asks:
1. "Was the resident injured?" → answer: "Yes, a minor laceration was noted."
2. "Who treated her?" → the LLM receives ONLY "Who treated her?" with no knowledge that "her" refers to the resident from question 1.

Follow-up questions that reference prior answers will produce wrong or generic responses.

### Fix

**Option A (recommended) — Change the API to POST:**

```ts
// New request shape
POST /api/staff/incidents/[id]/intelligence
Body: {
  question: string
  conversationHistory?: Array<{ question: string; answer: string }>
}
```

In the RAG prompt, prepend the conversation history before the question:
```
Prior conversation:
Q: Was the resident injured?
A: Yes, a minor laceration was noted on the right forearm.

Q: Who treated her?
```

**Option B (lighter) — Client passes a summary string:**

The client condenses the last 2 conversation turns into a `context` query param:
```
?question=Who+treated+her&context=Prior+Q%3A+Was+resident+injured%3F+A%3A+Yes%2C+minor+laceration.
```

Option A is cleaner and should be the chosen path.

**Task 38's route definition, RAG prompt template, and Task 39's fetch call all need to be updated.**

---

## Gap 3 — `generateEmbedding` function name is unverified

**Severity:** CRITICAL — Tasks 37 and 38 will fail at runtime if the function does not exist  
**Affects:** Task 37 (`lib/agents/answer-embedding-service.ts`), Task 38 (`lib/agents/vector-search.ts`)

### Problem

Both tasks call `generateEmbedding(text)` imported from `lib/openai.ts`. The existing codebase uses `generateAndStoreEmbedding()` which does significantly more than generating a vector (it also fetches the incident, builds the text, and writes to MongoDB). A plain `generateEmbedding(text): Promise<number[]>` may not be exported from `lib/openai.ts` under that name.

If the function does not exist with that exact name, both tasks will fail at import resolution.

### Fix

**Before executing task 37**, the agent must read `lib/openai.ts` and confirm the exact export name of the embedding generation function. Two likely scenarios:

**Scenario A** — A plain embedding function already exists:
```ts
// lib/openai.ts already exports:
export async function generateEmbedding(text: string): Promise<number[]>
```
→ Use it directly. No changes needed.

**Scenario B** — Only `generateAndStoreEmbedding` exists (the high-level function):
```ts
// lib/openai.ts only has:
export async function generateAndStoreEmbedding(input: { ... }): Promise<void>
```
→ Extract the low-level embedding call into a new exported helper:
```ts
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  })
  return response.data[0].embedding
}
```

**Add this verification step as Step 0 in Task 37's implementation prompt.**

---

## Gap 4 — `editedSections` merge is not specified in the complete route

**Severity:** FUNCTIONAL — the nurse's edits to the clinical record will be silently discarded  
**Affects:** Task 34, `app/api/report/complete/route.ts`

### Problem

Task 34 shows that `clinicalRecord` and `editedSections` are both passed to `/api/report/complete`. The complete route modifications say "use it directly" but never show how the two are merged. If the agent implements this naively by storing `clinicalRecord` as-is, any edits the nurse made to individual sections will be ignored and the un-edited AI version will be signed and stored.

### Fix

Add an explicit merge step in the complete route, before storing the clinical record:

```ts
// Apply nurse's edits to the pre-generated clinical record
const finalRecord = body.clinicalRecord
  ? { ...body.clinicalRecord, ...(body.editedSections ?? {}) }
  : await generateClinicalRecord(...)   // fallback: no preview was used

// Then store finalRecord (not body.clinicalRecord) in initialReport
```

**Task 34's Part D (complete route modifications) must show this merge explicitly.**

---

## Gap 5 — `areaHint` is undefined on dynamically generated Tier 2 questions

**Severity:** FUNCTIONAL — Tier 2 answer vectors will have empty `areaHint`, degrading retrieval quality  
**Affects:** Task 37, `app/staff/report/page.tsx` (`handleAnswer`), `lib/agents/answer-embedding-service.ts`

### Problem

Task 37 reads `activeQuestion.areaHint` and includes it in the embedding text. Tier 1 questions have `areaHint` defined in `lib/config/tier1-questions.ts`. Tier 2 questions are generated dynamically by the LLM in `lib/agents/expert_investigator/gap_questions.ts` — they likely do not include an `areaHint` field.

When a Tier 2 answer is recorded, `activeQuestion.areaHint` will be `undefined`. The embedding text will include `Area: undefined`, and the citation card in the Intelligence tab will show a blank area tag.

### Fix

Two parts:

**Part A — Add `areaHint` to dynamically generated Tier 2 questions:**
In `gap_questions.ts`, when building the `PendingQuestion` array, populate `areaHint` from the gap category or use a sensible default:
```ts
{
  id: `t2-q${i+1}`,
  text: question.text,
  areaHint: question.category ?? "Follow-up",  // ← add this
  askedAt: new Date().toISOString(),
}
```

**Part B — Defensive fallback in `answer-embedding-service.ts`:**
```ts
areaHint: params.areaHint || "General",   // never embed "undefined"
```

---

## Gap 6 — Redis session TTL may expire during extended preview review

**Severity:** MINOR — edge case; session expiry during long review breaks sign-off  
**Affects:** Task 34, `app/api/report/preview/route.ts`

### Problem

The `ReportSession` TTL is `REPORT_SESSION_TTL_SEC = 7200` (2 hours). When the nurse reaches the preview screen, she might spend significant time reading, editing sections, or stepping away. If she returns after the session expires, clicking "Sign and submit" will call `/api/report/complete` with a `sessionId` that no longer exists in Redis. The complete route will return a 4xx error and the nurse loses her work.

The preview route caches the clinical record inside the session. If the session expires, that cache is gone too.

### Fix

In the preview route, after storing the clinical record and saving the session, **extend the TTL**:

```ts
// After saving session back to Redis
await extendReportSession(sessionId, 3600)  // +1h for review time
```

If `extendReportSession` does not exist in `lib/config/report-session.ts`, add it:
```ts
export async function extendReportSession(
  sessionId: string,
  additionalSeconds: number
): Promise<void> {
  await redis.expire(sessionId, REPORT_SESSION_TTL_SEC + additionalSeconds)
}
```

Alternatively, document this as a known limitation in task 34's test cases and add a user-visible error: "Your session has expired. Please go back and re-submit your last answer to continue."

---

## Gap 7 — `pdfStatus` confirmation message not surfaced in the report card UI

**Severity:** MINOR — feedback to the nurse is missing  
**Affects:** Task 34 (complete route changes), `app/staff/report/page.tsx` (report card render)

### Problem

Task 34 adds `pdfStatus: "Your Phase 1 clinical report is being prepared for download."` to the complete route response. But `app/staff/report/page.tsx`'s `reportcard` render case likely doesn't display this field — it only shows what was defined before phase 11. The message will be generated but never shown.

### Fix

In the `reportcard` phase render case in `app/staff/report/page.tsx`, check for `reportCard.pdfStatus` and display it:

```tsx
{reportCard?.pdfStatus && (
  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
    <FileText className="h-3.5 w-3.5" />
    {reportCard.pdfStatus}
  </p>
)}
```

**Task 34 must add the report card display update to its scope.**

---

## Gap 8 — "What's done vs what remains" section missing from README

**Severity:** MINOR — convention gap; breaks the pattern used in all prior phases  
**Affects:** `README.md`

### Problem

Every prior phase README (phase_9, phase_10) has a **"What's done vs what remains"** section that is updated as tasks complete. The phase_11_b README does not have this section. Agents executing tasks will have no standard place to record progress.

### Fix

Add the following section to `README.md` after the "Files Created / Modified" table:

```markdown
---

## What's done vs what remains

### Done
*(nothing yet — phase opened 2026-06-06)*

### Remains
- Task 34: Preview API + clinical record preview + signature canvas
- Task 35: Server-side PDF generation
- Task 36: Staff printable report page + download button
- Task 37: Per-answer vectorization + incident_answer_vectors collection
- Task 38: Incident-scoped vector search + staff intelligence API
- Task 39: Intelligence tab with conversation history
```

---

## Summary table

| # | Gap | Severity | Task(s) | Fix needed in |
|---|-----|----------|---------|--------------|
| 1 | `ReportSession` missing `generatedClinicalRecord` type | CRITICAL | 34 | `lib/config/report-session.ts` + task-34 file list |
| 2 | Conversation history not sent to intelligence API | FUNCTIONAL | 38, 39 | task-38 route shape + task-39 fetch call |
| 3 | `generateEmbedding` function name unverified | CRITICAL | 37, 38 | task-37 implementation prompt (Step 0) |
| 4 | `editedSections` merge not shown in complete route | FUNCTIONAL | 34 | task-34 Part D |
| 5 | `areaHint` undefined on Tier 2 questions | FUNCTIONAL | 37 | `gap_questions.ts` + answer-embedding-service.ts |
| 6 | Redis TTL may expire during long preview review | MINOR | 34 | task-34 preview route + report-session.ts |
| 7 | `pdfStatus` not shown in report card UI | MINOR | 34 | task-34 scope + page.tsx reportcard case |
| 8 | "What's done vs what remains" section missing | MINOR | README | README.md |

---

## Gap 9 — Preview route sets wrong `reportPhase`, breaking sign-off

**Severity:** CRITICAL — sign-off returns 400 after the preview flow  
**Affects:** Task 34, `app/api/report/preview/route.ts` and `app/api/report/complete/route.ts`

### Problem

Task 34's preview route sets `session.reportPhase = "clinical_preview"` in Redis (Part A, step 5).

`app/api/report/complete/route.ts` has this hard guard (line 107):
```ts
if (session.reportPhase !== "signoff") {
  return NextResponse.json(
    { error: "Report is not ready for sign-off; complete all closing questions first." },
    { status: 400 },
  )
}
```

When the nurse reviews the preview and clicks "Sign and submit", the complete route reads the session from Redis, sees `reportPhase === "clinical_preview"`, and returns a 400 error. Sign-off is rejected. The nurse cannot submit her report.

### Fix

**The preview route must set `reportPhase = "signoff"`, not `"clinical_preview"`.**

`"clinical_preview"` is a React client-side phase — it describes what the UI is showing, not a server state. From the server's perspective, once the nurse has completed all closing questions, she is in a "ready to sign" state, which is exactly what `"signoff"` means.

In `app/api/report/preview/route.ts`, step 5:
```ts
// WRONG (breaks sign-off):
session.reportPhase = "clinical_preview"

// CORRECT:
session.reportPhase = "signoff"
```

**Consequence for Gap 1:** Since `reportPhase` is already typed as `ReportPhase` in the `ReportSession` interface, and `"clinical_preview"` is NOT in the `ReportPhase` union (`"tier1" | "gap_analysis" | "tier2" | "closing" | "signoff"`), task 34 does NOT need to add `"clinical_preview"` to the union. The `reportPhase` field in `lib/config/report-session.ts` requires no changes at all for this value.

**What still needs to change in `lib/config/report-session.ts` (Gap 1 remains):**
Only `generatedClinicalRecord` needs to be added to the `ReportSession` interface. The `reportPhase` field is already correctly typed.

---

## Updated summary table

| # | Gap | Severity | Task(s) | Status |
|---|-----|----------|---------|--------|
| 1 | `ReportSession` missing `generatedClinicalRecord` type | CRITICAL | 34 | Open — add to interface, NOT reportPhase (already typed) |
| 2 | Conversation history not sent to intelligence API | FUNCTIONAL | 38, 39 | **Fixed** in task files |
| 3 | `generateEmbedding` function name unverified | CRITICAL | 37, 38 | **Resolved** — function confirmed at `lib/openai.ts:56` |
| 4 | `editedSections` merge not shown in complete route | FUNCTIONAL | 34 | **Resolved** — `applyEditedSections()` already exists in complete route |
| 5 | `areaHint` undefined on Tier 2 questions | FUNCTIONAL | 37 | **Fixed** in task-37 |
| 6 | Redis TTL may expire during long preview review | MINOR | 34 | **Fixed** in task-34 |
| 7 | `pdfStatus` not shown in report card UI | MINOR | 34 | **Fixed** in task-34 |
| 8 | "What's done vs what remains" section missing | MINOR | README | **Fixed** in README |
| 9 | Preview route sets `reportPhase = "clinical_preview"` → sign-off 400 | CRITICAL | 34 | Open — change to `"signoff"` |
