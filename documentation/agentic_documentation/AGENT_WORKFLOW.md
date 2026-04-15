# WAiK Agent Workflow — Build, Test, Document

This document defines how to run **structured task-based development** with Cursor agents: one agent builds from a task file, a second tests against that task’s test cases, and a third updates documentation. It is readable by both humans and agents.

---

## Task file format

Every task lives in a single markdown file. Use this structure so agents can parse and execute it.

```markdown
# Task: <Short title>
## Phase: <number>
## Depends On: <task-id or "none">
## Estimated Time: <e.g. 4 hours>

## Context Files
- path/to/file.ts (create|update|replace)
- path/to/other.tsx (update)

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Test Cases
- <description> → expect <outcome>
- <description> → expect <outcome>

## Implementation Prompt
[paste the full Cursor prompt here]
```

- **Success Criteria** and **Test Cases** define “done” and how to verify; they enable autonomous or semi-autonomous runs.
- **Implementation Prompt** is the exact prompt to paste into Cursor Agent for the Builder.

---

## Build–Test–Document loop

Three agent roles run in sequence **per task**. Each role is a separate Cursor Agent session (or the same session with a new prompt).

| Step | Role       | Inputs                                      | Output |
|------|------------|---------------------------------------------|--------|
| 1    | **Builder**   | Task file (`task-XX-name.md`)               | Implementation + `task-XX-name-result.md` |
| 2    | **Tester**    | Task file + result file                     | Tests + `task-XX-name-test-report.md`     |
| 3    | **Documenter**| Task file + result + test report            | Updated docs + `task-XX-name-DONE.md`     |

### Builder

1. Read the task file completely.
2. Execute the **Implementation Prompt** exactly.
3. Run `npm run build` and fix any TypeScript errors.
4. Run `npm run lint` and fix any lint errors.
5. For each **Success Criterion**, verify it is met.
6. Create **`task-XX-name-result.md`** listing what was done and any deviations.

### Tester

1. Read the task file and the result file.
2. For each **Test Case** in the task file:
   - Write a test using the existing test setup (Vitest), or create the setup if missing.
   - Run the test.
   - If it fails, document why.
3. Create **`task-XX-name-test-report.md`** with: passed tests, failed tests, and recommended fixes.

### Documenter

1. Read the task file, result file, and test report.
2. Update documentation to reflect what was built:
   - `documentation/waik/01-SYSTEM-OVERVIEW.md` (feature/architecture changes)
   - `documentation/waik/03-API-REFERENCE.md` (API/auth changes)
   - `documentation/waik/02-DATABASE-SCHEMA.md` (schema changes)
   - Other docs as needed.
3. Create **`task-XX-name-DONE.md`** summarizing the completed feature.

---

## Copy-paste prompts

Replace `task-XX-name` and paths with the actual task id and paths (e.g. `task-01-clerk-auth`, `documentation/phases/phase-1/`).

### Builder prompt

```
You are building a feature for WAiK, a Next.js 14 application.

Read @documentation/phases/phase-N/task-XX-name.md completely.

Follow the Implementation Prompt exactly. When you are done:
1. Run `npm run build` and fix any TypeScript errors
2. Run `npm run lint` and fix any lint errors
3. For each Success Criterion, verify it is met
4. Create a file documentation/phases/phase-N/task-XX-name-result.md listing what was done and any deviations
```

### Tester prompt

```
Read @documentation/phases/phase-N/task-XX-name.md.
Read @documentation/phases/phase-N/task-XX-name-result.md.

Your job is to write and run tests for this feature.

For each Test Case in the task file:
1. Write a test using the existing test setup (or create one with Vitest if none exists)
2. Run the test
3. If it fails, document exactly why
4. Create documentation/phases/phase-N/task-XX-name-test-report.md with: passed tests, failed tests, and recommended fixes
```

### Documenter prompt

```
Read @documentation/phases/phase-N/task-XX-name.md.
Read @documentation/phases/phase-N/task-XX-name-result.md.
Read @documentation/phases/phase-N/task-XX-name-test-report.md.

Update the following documentation files to reflect what was built:
- documentation/waik/01-SYSTEM-OVERVIEW.md (add or update relevant section)
- documentation/waik/03-API-REFERENCE.md (add authentication/API details as needed)
- documentation/waik/02-DATABASE-SCHEMA.md (add new fields/schema if applicable)

Create documentation/phases/phase-N/task-XX-name-DONE.md summarizing the completed feature.
```

---

## Where tasks live

- **Directory:** `documentation/phases/phase-1/`, `phase-2/`, … `phase-7/`
- **Task files:** `task-01-clerk-auth.md`, `task-02-multi-tenant-isolation.md`, …
- **Artifacts (created by agents):** `task-01-clerk-auth-result.md`, `task-01-clerk-auth-test-report.md`, `task-01-clerk-auth-DONE.md`

Task numbering is global (task-01 through task-17). Phase folders group tasks by phase from the pilot plan.

---

## References

- [Cursor Learn – Putting it all together](https://cursor.com/learn/putting-it-together) — Plan → Build → Debug → Review workflow.
- [Developer Toolkit – Test-Driven Development in Cursor](https://developertoolkit.ai/en/cursor-ide/lessons/testing-tdd/) — Tests as specification; implement until tests pass; pre-PR validation.

Source plan: `documentation/phase 1/waik_pilot_phase_1.md`.
