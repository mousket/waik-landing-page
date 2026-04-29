# Phase IR-3 — Analytics + Data Strategy — COMPLETE

## Tasks Completed
- [x] IR-3a — Analytics aggregation endpoints (overview, staff, trends)
- [x] IR-3b — Weekly intelligence report auto-generation
- [x] IR-3c — Question effectiveness tracking
- [x] IR-3d — Staff improvement trajectory
- [x] IR-3e — Old route cleanup + migration verification
- [x] IR-3f — Complete integration test

## New Files Created

API routes
- `app/api/admin/analytics/overview/route.ts`
- `app/api/admin/analytics/staff/route.ts`
- `app/api/admin/analytics/trends/route.ts`
- `app/api/admin/analytics/questions/route.ts`
- `app/api/staff/analytics/trajectory/route.ts`
- `app/api/cron/weekly-report/route.ts`
- `app/api/admin/incident-config/route.ts` *(IR-2f, listed for context)*

Library / agents
- `lib/agents/weekly-report-generator.ts`
- `lib/analytics/question-effectiveness.ts`
- `lib/analytics/staff-trajectory.ts`

Configuration
- `vercel.json` — Monday 07:00 UTC cron schedule for weekly reports

Schema enrichment
- `backend/src/models/incident.model.ts` — `DataPointRowSchema` extended
  with optional `questionText` + `fieldsCovered` (additive; defaults to
  `""` / `[]`).
- `app/api/report/complete/route.ts` — now persists `questionText` and
  `fieldsCovered` from the in-flight `ReportSession`.

Tests
- `__tests__/phase-IR3-integration.test.ts` — 7 deterministic tests
  covering route exports, weekly-report fallback math, question-ranking
  grouping/scoring/threshold, staff-trajectory streaks + trend
  classifier (improving/declining), and absence of legacy patterns.

Documentation / markers
- `plan/pilot_1/phase_IR3/IR-3e-VERIFIED.md`
- `plan/pilot_1/phase_IR3/EPIC-DONE.md` *(this file)*

## The Complete Incident Reporting Stack

```
Frontend
  app/staff/report/page.tsx → QuestionBoard → VoiceInputScreen

API Layer
  POST /api/report/start    → create incident + Redis session
  POST /api/report/answer   → persist answer + re-analyze gaps
  POST /api/report/complete → sign-off + clinical record + report card

Intelligence Pipeline
  analyze.ts → gap_questions.ts → fill_gaps.ts → finalize.ts
  clinical-record-generator.ts → verification-agent.ts
  embedding-service.ts → vector-search.ts → intelligence-qa.ts

Analytics
  question-effectiveness.ts → staff-trajectory.ts
  weekly-report-generator.ts → /api/admin/analytics/* + /api/staff/analytics/*

Storage
  MongoDB: IncidentModel (permanent record + 1536-d embeddings)
  Redis:   ReportSession (live session, 2hr TTL)
           waik:weekly-report:{facilityId}:{weekStart} (7d TTL)
           waik:analytics:* (5–60min TTL)
```

## What WAiK Now Captures Per Incident
- Original nurse narrative (preserved verbatim, sealed at sign-off)
- AI-generated clinical record (verified for fidelity)
- Gold Standard analysis (22+ fields for falls)
- Analytics: questions generated, answered, deferred, active seconds
- Data points per question, **with** question text + fields covered
  (for Question Compressor training)
- Searchable embedding (1536 dimensions, text-embedding-3-small)
- Verification result (fidelity score, additions, omissions)
- Report card coaching tips (personalized, LLM-generated with
  deterministic fallback)

## What WAiK Now Answers
- "What are the most common fall locations this month?"
  → `GET /api/admin/analytics/overview?days=30`
- "Which residents have had repeated incidents?"
  → `overview.topResidents`
- "Who needs coaching?"
  → `GET /api/admin/analytics/staff` (per-staff completeness, streak,
  trend)
- "How is Maria Torres improving over time?"
  → `GET /api/staff/analytics/trajectory` (her own); admin views via
  staff endpoint
- "Which question phrasings produce the most data points?"
  → `GET /api/admin/analytics/questions` (composite effectiveness score
  weighted 50/30/20 over avg coverage / frequency / peak coverage)
- "What's the documentation-quality trend week over week?"
  → Weekly intelligence report — unprompted, every Monday 07:00 UTC,
    persisted at `waik:weekly-report:{facilityId}:latest`

## Adaptations from Spec
- `generateChatCompletion` real signature is
  `(messages: ChatCompletionMessageParam[], { maxTokens })` — not the
  spec's `(systemPrompt, userPrompt, opts)`.
- Facility activation flag is `isActive: boolean`, not
  `status: "active"`. Cron iterates `{ isActive: true }`.
- Notification fan-out for the weekly report is deferred:
  `NotificationModel` requires `incidentId` in its current schema, so
  facility-scoped weekly-report-ready notifications would need a
  schema widening pass first. Reports are persisted to Redis and
  served via `/api/admin/analytics/*` instead.
- `dataPointsPerQuestion` schema enrichment was required by IR-3c —
  the in-flight `ReportSession` already tracked `questionText` and
  `fieldsCovered`, but Mongo persistence was dropping both. The change
  is additive (existing rows default to `""` / `[]`); legacy rows fall
  back to grouping by `questionId`.

## Manual QA Checklist (live stack required)

The end-to-end journey from the spec must be exercised against a
running deploy:

```
LAYER 1 — Incident report flow
  Maria Torres signs in → fall on Margaret Chen Room 102 →
  answer Tier 1 (5) → gap analysis → answer Tier 2 (3) →
  defer one → return → answer rest → closing questions →
  sign-off → report card with score/streak/coaching.

LAYER 2 — Persistence
  Mongo doc has phase=phase_1_complete, originalNarrative,
  enhancedNarrative, signature, goldStandard, verificationResult,
  completenessAtSignoff > 0, activeDataCollectionSeconds > 0,
  dataPointsPerQuestion non-empty (with questionText + fieldsCovered),
  embedding length 1536, auditTrail signed entry.
  Redis: waik:report:{id} deleted post-sign-off.

LAYER 3 — Intelligence
  POST /api/intelligence/query "Tell me about Margaret Chen's fall"
  GET /api/admin/intelligence/insights → cards include the new incident.

LAYER 4 — Analytics
  GET /api/admin/analytics/overview?days=30 → totals include new incident.
  GET /api/admin/analytics/staff → Maria Torres present with metrics.
  GET /api/staff/analytics/trajectory → trajectory includes new incident.
  GET /api/admin/analytics/questions → ranking populated.
  Trigger /api/cron/weekly-report with the cron Bearer token →
    Redis key waik:weekly-report:{facilityId}:latest populated.

LAYER 5 — Admin dashboard
  Sign in as DON Sarah Kim → Room 102 fall in Needs Attention →
  detail view shows full Phase 1 record.
```

## Verification at sign-off
- `npm run build` → ✓ Compiled successfully
- `npm test -- --run` → ✓ 15 test files / 78 tests passing
- `IR-3e` legacy-pattern grep → 0 matches outside historical-context
  comments (covered by `phase-IR3-integration.test.ts`).
