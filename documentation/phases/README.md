# WAiK Pilot — Phase Task Checklist

Run tasks in order. For each task: **Builder** → **Tester** → **Documenter**. See [AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md) for copy-paste prompts and artifact names.

---

## Phase 1 — Foundation & Auth

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 00 | [task-00-test-setup](phase-1/task-00-test-setup.md) | [ ] | [ ] | [ ] | — |
| 01 | [task-01-clerk-auth](phase-1/task-01-clerk-auth.md) | [ ] | [ ] | [ ] | — |
| 02 | [task-02-multi-tenant-isolation](phase-1/task-02-multi-tenant-isolation.md) | [ ] | [ ] | [ ] | task-01 |

---

## Phase 2 — Core Hardening

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 03 | [task-03-production-bugs](phase-2/task-03-production-bugs.md) | [ ] | [ ] | [ ] | task-02 |
| 04 | [task-04-pwa-foundation](phase-2/task-04-pwa-foundation.md) | [ ] | [ ] | [ ] | task-03 |

---

## Phase 3 — Dashboards

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 05 | [task-05-staff-dashboard](phase-3/task-05-staff-dashboard.md) | [ ] | [ ] | [ ] | task-04 |
| 06 | [task-06-admin-dashboard](phase-3/task-06-admin-dashboard.md) | [ ] | [ ] | [ ] | task-05 |

---

## Phase 4 — Features

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 07 | [task-07-assessment-system](phase-4/task-07-assessment-system.md) | [ ] | [ ] | [ ] | task-06 |
| 08 | [task-08-resident-story](phase-4/task-08-resident-story.md) | [ ] | [ ] | [ ] | task-07 |
| 09 | [task-09-phase2-intelligence](phase-4/task-09-phase2-intelligence.md) | [ ] | [ ] | [ ] | task-08 |

---

## Phase 5 — Admin & Settings

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 10 | [task-10-staff-management](phase-5/task-10-staff-management.md) | [ ] | [ ] | [ ] | task-09 |
| 11 | [task-11-admin-settings](phase-5/task-11-admin-settings.md) | [ ] | [ ] | [ ] | task-10 |

---

## Phase 6 — PWA & Notifications

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 12 | [task-12-push-notifications](phase-6/task-12-push-notifications.md) | [ ] | [ ] | [ ] | task-11 |
| 13 | [task-13-pilot-hardening](phase-6/task-13-pilot-hardening.md) | [ ] | [ ] | [ ] | task-12 |

---

## Phase 7 — Navigation, Intelligence & History

| # | Task | Build | Test | Doc | Depends On |
|---|------|-------|------|-----|------------|
| 14 | [task-14-navigation-incident-history](phase-7/task-14-navigation-incident-history.md) | [ ] | [ ] | [ ] | task-13 |
| 15 | [task-15-community-intelligence](phase-7/task-15-community-intelligence.md) | [ ] | [ ] | [ ] | task-14 |
| 16 | [task-16-notification-center](phase-7/task-16-notification-center.md) | [ ] | [ ] | [ ] | task-15 |
| 17 | [task-17-bulk-import](phase-7/task-17-bulk-import.md) | [ ] | [ ] | [ ] | task-16 |

---

## How to use

1. Open the task file (e.g. `phase-1/task-01-clerk-auth.md`).
2. **Builder:** New Cursor Agent → paste Builder prompt from [AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md), replace task path. Run. Check `task-XX-name-result.md`.
3. **Tester:** New Cursor Agent → paste Tester prompt, replace task path. Run. Check `task-XX-name-test-report.md`.
4. **Documenter:** New Cursor Agent → paste Documenter prompt, replace task path. Run. Check `task-XX-name-DONE.md`.
5. Check the three boxes for that task in the table above. Move to the next task.

Source: [documentation/phase 1/waik_pilot_phase_1.md](../phase%201/waik_pilot_phase_1.md).
