# WAiK Pilot 1 — Build Plan
## 17 Tasks · 7 Phases · 30 Days

This folder contains every task required to take WAiK from its current state
to a pilot-ready PWA. Each task file is self-contained and can be given directly
to a Cursor agent or Claude Code agent as a build instruction.

---

## How to Use These Files

1. Work through tasks in phase order — each phase depends on the previous
2. Paste the `## Implementation Prompt` section into Cursor Agent mode
3. After the agent completes, run the `## Test Cases` manually or with a test agent
4. Check off every item in `## Success Criteria` before moving to the next task
5. Never start a task if its `## Depends On` tasks are not complete

---

## Phase Overview

| Phase | Folder | Days | Focus | Tasks |
|---|---|---|---|---|
| 1 | phase_1/ | 1–5 | Auth & Security Foundation | task-01, task-02 |
| 2 | phase_2/ | 6–10 | Critical Bug Fixes + PWA | task-03, task-04 |
| 3 | phase_3/ | 11–16 | Dashboard Rebuilds | task-05, task-06 |
| 4 | phase_4/ | 17–22 | Core Features | task-07, task-08, task-09 |
| 4b | [phase_4b/](./phase_4b/phase_4b_readme.md) | after task-09 | **Phase 2 + Intelligence completion** (gaps) | 4b-01 … 4b-06 |
| 5 | phase_5/ | 23–26 | Admin Settings & User Management | task-10, task-11 |
| 6 | phase_6/ | 27–30 | Push Notifications & Pilot Hardening | task-12, task-13 |
| 7 | phase_7/ | ongoing | Navigation, Intelligence & Imports | task-14, task-15, task-16, task-17 |

---

## Environment Variables Required

Set all of these in `.env.local` before starting Phase 1:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/after-sign-in
DATABASE_URL=mongodb+srv://...
MONGODB_DB_NAME=waik-pilot
OPENAI_API_KEY=sk-...
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small
REDIS_URL=redis://...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
SENTRY_DSN=https://...
NEXT_PUBLIC_APP_URL=https://your-pilot-domain.vercel.app
CRON_SECRET=random-secret-string
```

---

## Files to Delete Before Pilot

```
lib/google-sheets.ts                      ← SECURITY RISK, remove immediately
data/db.json                              ← Remove after MongoDB migration confirmed
data/embeddings.json                      ← Remove after Redis has embeddings
app/api/auth/login/route.ts               ← Remove after task-01 completes
lib/auth-store.ts                         ← Remove after task-01 completes
backend/scripts/migrate-lowdb-to-mongo.ts ← Keep locally, never deploy
```

---

## Pilot Success Metrics (What You Must Prove)

1. Average time to complete Phase 1 report → target: under 10 minutes
2. Average report completeness score → target: above 85%
3. Phase 2 close rate → % of Phase 1 incidents that reach closure
4. Staff feedback score → average thumbs up/down rating
5. At least one documented MDS recovery dollar amount
