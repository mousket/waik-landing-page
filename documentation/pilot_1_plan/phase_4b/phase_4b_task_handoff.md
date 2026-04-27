# Phase 4b — Task handoff

## Purpose

This file is the **entry point** for implementers. Read [phase_4b_readme.md](./phase_4b_readme.md) first, then open the task file for your workstream. Each task file has:

- **Context** (what already ships)
- **Scope** (in / out)
- **Success criteria**
- **Implementation prompt** (paste into the agent)
- **Files to touch** (non-exhaustive)
- **Verification** (commands + manual checks)

## Order of execution

1. [task-4b-01-idt-questions-done.md](./task-4b-01-idt-questions-done.md)
2. [task-4b-02-section-workspaces-done.md](./task-4b-02-section-workspaces-done.md)
3. [task-4b-03-resident-context-done.md](./task-4b-03-resident-context-done.md)
4. [task-4b-04-notifications-phase2-done.md](./task-4b-04-notifications-phase2-done.md)
5. [task-4b-05-waik-intelligence-done.md](./task-4b-05-waik-intelligence-done.md)
6. [task-4b-06-qa-and-docs-done.md](./task-4b-06-qa-and-docs-done.md)

## Conventions

- **Completed** workstreams: rename the task file by appending **`-done`** before `.md` (e.g. `task-4b-01-…-done.md`) and update links in this handoff and `phase_4b_readme.md`.
- **Do not** create new top-level API namespaces without updating `phase_4b_readme.md` and 4b-06.
- **Prefer** extending `Phase2InvestigationShell` and section routes over duplicating pages.
- **Record** any intentional product change from Task 09 in 4b-06 (e.g. “deferred: voice on IDT”).

## Demos and manual testing (super admin)

End of [phase_4b_readme.md](./phase_4b_readme.md): **“Super admin: how to test and demo in the UI”** — facility context, URL patterns, claim → sections → sign-off → lock/unlock, `/admin/intelligence`, talk track, and a troubleshooting table.
