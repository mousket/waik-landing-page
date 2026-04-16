# Agent handoff — Pilot 1 plan status & next steps

**Purpose:** Give the next AI agent (or human) enough context to continue without re-deriving history. Update this file when major milestones shift.

**Last updated:** 2026-04-15

---

## Terminology (avoid mixing these up)

| Name | Meaning |
|------|--------|
| **Incident `phase` field** | Workflow state on an incident document (e.g. `phase_1_in_progress`). Defined in `backend/src/models/incident.model.ts` and `lib/types.ts`. |
| **Pilot plan Phase 0.5–0.7** | Pre–Phase-1 work (role routing, shells, seed spec/script). Folders: `phase_0.5/`, `phase_0.6/`, `phase_0.7/`. |
| **Pilot plan Phase 1–7** | Main roadmap in `documentation/pilot_1_plan/README.md` (auth → PWA → dashboards → … → ongoing Phase 7). |

---

## Where we are right now

1. **Phase 0.5 / 0.6 (shells & routing)** — Implemented in app code (staff/admin/waik-admin shells, role routing after sign-in, design tokens). See task docs under `phase_0.5/` and `phase_0.6/`.

2. **Phase 0.7 (dev seed)**  
   - **Spec (task 00j):** `documentation/pilot_1_plan/phase_0.7/task-00j-seed-data-spec.md` — authoritative seed content.  
   - **Script (task 00k):** Implemented at `scripts/seed-dev.ts` with npm scripts `seed:dev`, `seed:reset`, `seed:all`, `seed:fresh` in `package.json`. References the 00j spec in its header comment.  
   - **Pre-flight (00j):** Incident model in `backend/src/models/incident.model.ts` uses the four-value `phase` enum and extended top-level `idtTeam` fields (`questionSent`, `questionSentAt`, `response`, `respondedAt`, `status`). `INCIDENT_PHASES` is exported for reuse; Mongoose `phase` is `required: true` with default `phase_1_in_progress`.  
   - **Status:** Implementation exists; treat **Phase 0.7 as “done” only after** someone runs the success criteria in `task-00k-seed-script.md` (idempotency, counts, sign-in smoke tests) and ticks or replaces those checkboxes, **or** adds `task-00k-DONE.md`. The 00k markdown file still lists unchecked success criteria — that is **documentation debt**, not proof the script is wrong.  
   - **Verification gate:** `npm run seed:dev` needs a reachable MongoDB (e.g. Atlas IP allowlist includes the machine running the script) and valid `DATABASE_URL` / `MONGODB_DB_NAME`. A failed run with `MongooseServerSelectionError` / whitelist messaging is an **environment** issue, not necessarily a script bug.

3. **Pilot plan Phase 1** (`phase_1/`) — **Marked complete in-repo** via:
   - `phase_1/task-01-DONE.md` (Clerk, auth, removed legacy login)
   - `phase_1/task-02-DONE.md` (multi-tenant isolation, facility scoping, models)

4. **Pilot plan Phase 2** (`phase_2/`) — **No `*-DONE.md` files.** Tasks: production bugs (task-03), PWA foundation (task-04). Treat as **not** formally closed in documentation.

5. **Pilot plan Phase 3** (`phase_3/`) — **No `*-DONE.md` files.** Tasks: staff dashboard (task-05), admin dashboard (task-06). Treat as **not** formally closed in documentation (some UI may exist from Phase 0.6 shells — verify against each task’s success criteria).

6. **Pilot plan Phase 7** (`phase_7/`) — Per `README.md`, Phase 7 is **ongoing** (navigation, intelligence, notifications, bulk import). **We are not “done with Phase 7.”** It is a long-running track, not a single completion gate.

---

## Are we “done with Phase 0.7”?

- **Code:** Seed script and wiring are present (`scripts/seed-dev.ts`, related models).  
- **Process:** **Not fully closed** until 00k’s checklist is executed and documented (or a `task-00k-DONE.md` is added mirroring 01/02).  
- Optional: add `task-00j-DONE.md` when the team signs off the spec as frozen.

---

## Cleanup & follow-ups

| Item | Notes |
|------|--------|
| **`SEED_CLERK_PASSWORD`** | Documented in **`.env.example`** (optional; dev-only). Script reads it in `scripts/seed-dev.ts`. |
| **`task-00k-seed-script.md` checkboxes** | Reconcile with reality after a full manual run; or add `task-00k-DONE.md`. |
| **`PILOT_READY.md`** | Master readiness checklist — still mostly unchecked; use for go-live, not for day-to-day phase completion. |
| **Schema / call sites** | If incident phase enum or IDT shapes change again, grep for old strings and align agents + UI with `task-00j` appendix. |
| **Task-02-DONE follow-ups** | Optional: refresh `documentation/waik/02-DATABASE-SCHEMA.md` and `03-API-REFERENCE.md` when convenient. |

---

## Suggested next actions for the next agent

1. **Verify Phase 0.7 formally:** Ensure MongoDB is reachable from your machine (Atlas: add current IP to the cluster allowlist if needed). Then run `npm run seed:dev`, `npm run seed:reset`, and `npm run seed:dev` again; confirm counts and sign-in scenarios in `task-00k-seed-script.md`; update that file’s checkboxes or add `task-00k-DONE.md`.  
2. **Pick the next pilot milestone** from `documentation/pilot_1_plan/README.md` in order (Phase 2 task-03 unless product priority says otherwise).  
3. **Phase 7 work:** Only when explicitly scheduled — tasks live under `documentation/pilot_1_plan/phase_7/`.  
4. **Keep this file updated** when Phase 0.7 is signed off or when Phase 2/3 get DONE markers.

---

## Quick links

- Plan index: [`../README.md`](../README.md)  
- Pilot readiness checklist: [`../PILOT_READY.md`](../PILOT_READY.md)  
- Seed spec: [`task-00j-seed-data-spec.md`](./task-00j-seed-data-spec.md)  
- Seed script task / criteria: [`task-00k-seed-script.md`](./task-00k-seed-script.md)  
- Implementation: `scripts/seed-dev.ts`, `scripts/seed-reset.ts` (if present)
