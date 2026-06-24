# Phase 9 — Agent handoff

**Read first:** [`README.md`](./README.md) (task index, done convention, status).

## One-sentence mission

Bridge **Redis `ReportSession`** to **MongoDB `incident.questions[]` + draft `initialReport`** so staff/admin incident detail and resume flows show real report data.

## Execute in order

| Step | File |
|------|------|
| 1 | `task-22-sync-session-to-incident-done.md` |
| 2 | `task-23-checkpoint-and-seed-done.md` |
| 3 | `task-24-complete-flush-done.md` |
| 4 | `task-25-resume-api-done.md` |
| 5 | `task-26-report-resume-ui-done.md` |
| 6 | `task-27-gap-analysis-retry-done.md` (Phase 10 task-32) |
| 7 | `task-28-integration-verification-done.md` |

## When you finish a task

1. Mark **Status: DONE** + date in the task file.  
2. Rename: `task-NN-….md` → `task-NN-…-done.md`.  
3. Update **`README.md`** task table (Open → Done) and **What’s done vs what remains**.

## Do not

- Invent new question ID schemes on each sync (upsert by stable `id`).
- Break `staffQuestionGroup()` bucketing (set `generatedBy` / `priority.phase` per task 22).
- Remove Redis sessions until resume API exists (task 25).

## Quick verification after task 23

```bash
# After manual report: Tier 1 answer → GET incident
curl -s -b cookies.txt "/api/incidents/inc-XXXXXXXX" | jq '.questions | length'
# Expect > 0 with answers on answered rows
```
