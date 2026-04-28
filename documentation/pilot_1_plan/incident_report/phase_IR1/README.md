# Phase IR-1 — Incident Reporting Frontend + Backend Wiring
## Epic Overview

---

## What This Phase Builds

The complete connection layer between the staff report page UI and the
expert investigator intelligence pipeline. When this phase is done, a
nurse can open WAiK, select a fall incident, answer Tier 1 questions via
voice, receive AI-generated Tier 2 gap-fill questions, answer them,
see questions disappear as her answers cover their gaps, defer remaining
questions to answer later, and sign off on the completed report — all
backed by real API calls, real Redis sessions, real MongoDB persistence,
and real LLM-powered gap analysis.

---

## Architecture Reference

All tasks in this phase reference:
**WAiK_Incident_Reporting_Blueprint.md** (Output 1)

Do not make architectural decisions in the task files. The blueprint
has already made them. If something in a task file conflicts with the
blueprint, the blueprint wins.

---

## Subtask Index

| Task   | What It Builds                                        | Est. Time |
|--------|------------------------------------------------------|-----------|
| IR-1a  | POST /api/report/start route                         | 2-3 hrs   |
| IR-1b  | POST /api/report/answer — Tier 1 logic               | 2-3 hrs   |
| IR-1c  | POST /api/report/answer — Tier 2 (expert investigator)| 3-4 hrs   |
| IR-1d  | POST /api/report/answer — closing + deferral         | 2 hrs     |
| IR-1e  | POST /api/report/complete route                      | 4-5 hrs   |
| IR-1f  | Wire report page to real API calls                   | 3-4 hrs   |
| IR-1g  | Data-driven question board component                 | 3-4 hrs   |
| IR-1h  | Delete old routes + verification rollup              | 1-2 hrs   |

---

## Dependencies

Phase 0 through 0.7 must be complete (Clerk auth, MongoDB models, Redis).
VoiceInputScreen component must exist (from task-03d).
Expert investigator pipeline files must exist and be functional:
  - lib/agents/expert_investigator/analyze.ts
  - lib/agents/expert_investigator/gap_questions.ts
  - lib/agents/expert_investigator/fill_gaps.ts
  - lib/agents/expert_investigator/finalize.ts
  - lib/agents/expert_investigator/session_store.ts

---

## New Files Created in This Phase

```
lib/config/tier1-questions.ts           — Tier 1 + closing questions config
lib/config/report-session.ts            — ReportSession type + Redis helpers
app/api/report/start/route.ts           — POST /api/report/start
app/api/report/answer/route.ts          — POST /api/report/answer
app/api/report/complete/route.ts        — POST /api/report/complete
components/staff/question-board.tsx      — Data-driven question board
```

## Files Modified in This Phase

```
app/staff/report/page.tsx               — Real API integration (replace stubs)
```

## Files Deleted in This Phase (IR-1h only, after verification)

```
app/api/agent/report/route.ts
app/api/agent/report-conversational/route.ts
app/api/agent/interview/start/route.ts
app/api/agent/interview/answer/route.ts
app/api/agent/interview/complete/route.ts
app/api/agent/investigate/route.ts
```
