# Task IR-2g — Integration verification — DONE (verification harness + backfill)

This task is primarily **verification**, not new product surface area. To make it repeatable, we added scripts that validate the IR‑2 pipeline end-to-end from Mongo.

## Scripts added

- `scripts/verify-ir2g.ts`
  - Checks signed incidents in a time window for:
    - embedding present
    - embedding dims = **1536**
    - `investigation.verificationResult` present
  - Usage:
    - `npx ts-node --compiler-options '{"module":"commonjs"}' scripts/verify-ir2g.ts --facilityId <id> --days 30`
  - If `--facilityId` is omitted, it lists up to 8 active facilities.

- `scripts/backfill-incident-embeddings.ts`
  - Backfills missing incident embeddings for signed incidents.
  - Usage:
    - `npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-incident-embeddings.ts --facilityId <id>`

- `scripts/backfill-verification-results.ts`
  - Attempts to backfill `investigation.verificationResult` for signed incidents **only when** `initialReport.narrative` and `initialReport.enhancedNarrative` exist.
  - Usage:
    - `npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-verification-results.ts --facilityId <id>`

## Notes from running against demo data

- Many seed / legacy incidents can be in a signed phase but **lack `initialReport.*`**, so `verificationResult` cannot be meaningfully backfilled from the stored data.
- Embeddings can be backfilled for these incidents (and were).

## What still needs manual validation (true end-to-end)

To fully “pass” the IR‑2g checklist, create 2–3 new incident reports via the IR‑1 flow (so `initialReport.narrative` + `initialReport.enhancedNarrative` are present), then:

1. Re-run `scripts/verify-ir2g.ts` and confirm:
   - embeddings present and 1536 dims
   - verificationResult present
2. Hit `/api/intelligence/query` and `/api/admin/intelligence/query` and confirm:
   - answers cite multiple incidents when relevant
3. Hit `/api/admin/intelligence/insights` and confirm:
   - returns insight cards (cached in Redis for 1h)

