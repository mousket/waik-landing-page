# Task 5 — End-to-end verification (analyzer extraction fix)

Use this checklist after deploying to staging or production. Automated coverage includes `analyzeNarrativeAndScore` normalization tests and Tier 1 → gap continuity wiring; this document covers **hands-on flows**.

## Prerequisites

- Signed in as **staff**, facility with fall reporting enabled.
- Optional: confirm `OPENAI_API_KEY` is set on Vercel if validating **LLM** Tier 2 phrasing (without key, Tier 2 uses deterministic fallback wording).

---

## Scenario A — Rich Tier 1 (expect fewer naive Tier 2 repeats)

Complete a **Fall** report with Tier 1 answers similar to:

- Detailed narrative including **witnessed/unwitnessed**, **injuries / no head trauma** phrasing consistent with normalization (e.g. “no bleeding… no immediate signs of head trauma”).
- Environment: lighting, dry floor, **no clutter**.
- Explicit **walker out of reach** (or bedside equipment placement).
- New Tier 1 fields: **footwear**, **pre-fail symptoms**, **call light**.

**Verify**

- Tier 2 does **not** re-ask generic “tell us about the environment again” questions that Tier 1 already covered (wording may differ; substance should skip obvious duplicates).
- No Tier 2 questions that plainly duplicate Tier 1 **prompt text** (continuity hints + extraction should reduce verbatim echo).
- Incident completes sign-off without errors; completeness threshold still advances appropriately.

---

## Scenario B — Sparse Tier 1 (expect legitimate Tier 2 gaps)

Answer Tier 1 with **short**, minimal transcripts (few sentences, omit footwear/call light/symptoms).

**Verify**

- Tier 2 still surfaces follow-ups where Gold Standard fields are **actually missing**.
- Closing + sign-off still require all closing answers.

---

## Regression spot-checks

- Start a **new** report after Tier 1 id change: root cause is **`t1-q8`**, footwear/symptoms/call light **`t1-q5`–`t1-q7`**.
- Older in-flight Redis sessions may have stale Tier 1 keys; acceptable to **discard** stale drafts or restart report.

---

## If something fails

- Capture: Tier 1 full narrative (combined), sample Tier 2 question list, facility id, approximate time.
- Vercel logs: `/api/report/answer` for `gap_analysis` or Tier 2 updates.
- Digest errors: search logs by digest if the client surfaces a digest.
