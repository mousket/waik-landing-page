# Phase 4b — Complete Phase 2 + WAiK Intelligence (gaps from Task 09)

## Status: **Complete** (2026-04-26) — 4b-01 … 4b-06 implementation pass (QA matrix: fill after staging)

Phase **4b** is a follow-on to [Phase 4, Task 09 — Phase 2 Investigation + WAiK Intelligence](../phase_4/task-09-phase2-intelligence.md). A first implementation pass landed: claim overlay, four-tab shell, sign-off/lock/unlock APIs, section PATCH API, basic section pages, and admin community intelligence. **Phase 4b** finishes the regulatory and UX spec: IDT workflow, full section workspaces, resident context, push notifications, intelligence parity (charts, naming), and QA.

This phase is **not** a greenfield build. It extends existing code paths and keeps **facility scoping** and **role rules** (e.g. `canAccessPhase2`, DON vs administrator) consistent everywhere.

---

## Architecture snapshot (what exists today)

### Data model (Mongo)

- **`incident`**: `phase`, `phase2Sections` (four blocks with `status` / `factors` / `description` / etc.), `idtTeam` (flat list with `userId`, `name`, `role`, optional question/response fields), `phaseTransitionTimestamps` (e.g. `phase1Signed`, `phase2Claimed`, `phase2Locked`), `auditTrail`, `investigation.signatures` (DON + admin) on close/sign-off path.
- **Interventions** live on **resident** documents/APIs; Phase 2 “intervention review” and “new intervention” must sync with that model where the spec says so.

### API surface (implemented)

| Route | Role |
|-------|------|
| `GET /api/incidents` | Optional `residentId` query (with admin facility scope) to list that resident’s incidents |
| `PATCH /api/incidents/[id]/phase` | Claim: `phase_1_complete` → `phase_2_in_progress` (no direct `closed` here — use lock) |
| `PATCH /api/incidents/[id]/sections/[sectionName]` | `contributing-factors` \| `root-cause` \| `intervention-review` (complete: decision per current resident intervention) \| `new-intervention` |
| `POST /api/incidents/[id]/signoff` | Records one of DON / admin signatures |
| `POST /api/incidents/[id]/lock` | Requires dual signatures + all four sections complete (unless super-admin bypass) |
| `POST /api/incidents/[id]/unlock` | Reason ≥ 20 chars, clears signatures |
| `POST /api/incidents/[id]/idt-team` | Add IDT member (Phase 2, same-facility user) |
| `DELETE /api/incidents/[id]/idt-team?userId=` | Remove IDT member (blocked if open IDT questions) |
| `POST /api/incidents/[id]/idt-questions` | Send Phase 2 IDT question (persists in `questions[]` with `metadata.idt`) |
| `POST /api/incidents/[id]/suggest-root-cause` | AI draft for root-cause field (this incident’s text only; 503 if no `OPENAI_API_KEY`) |
| Admin: `POST /api/admin/intelligence/query`, `GET` insights, `GET` daily-brief (facility-scoped) | Community intelligence |

### Key UI files

- `app/admin/incidents/[id]/page.tsx` — switches to `Phase2InvestigationShell` when `phase` is `phase_1_complete`, `phase_2_in_progress`, or `closed`
- `components/admin/phase2-investigation-shell.tsx` — tabs, claim, summary, audit, section links
- `app/admin/incidents/[id]/section/[sectionName]/page.tsx` — partial section UIs
- `app/admin/incidents/[id]/signoff/page.tsx` — dual sign + lock
- `app/admin/intelligence/page.tsx` — ask + suggested queries + cards + daily brief

### Gaps (why phase 4b exists)

- IDT: **add/remove team members**, question composer, **overdue reminder** push, alignment with `POST /api/incidents/[id]/questions` and existing `Question` model
- Section workspaces: **4b-02 done** — intervention review, new intervention → `POST` resident, 30s autosave, `suggest-root-cause` (optional: AI for IDT questions later)
- Resident context tab: **4b-03 done** — `GET /api/residents/[id]` + `Phase2ResidentContextTab` (interventions, 30/90/180 pattern w/ amber ≥3 in 30d, assessments preview; `next/dynamic` code-split)
- **Push notifications (4b-04)**: in-app + server log “push” (device push still via stub when VAPID is not live); dedupe for “all sections complete”
- **WAiK Intelligence (4b-05)**: **Completeness trend** 8-week chart (Recharts) + card title parity, `/api/intelligence/*` aliases, incident id links in answers
- **4b-06**: Vitest for `areAllPhase2SectionsComplete`, release checklist, env appendix in task-4b-06-done

---

## Task index (recommended order)

Finished workstreams use a **`-done`** suffix on the task filename (e.g. `task-4b-01-…-done.md`).

| Order | ID | Focus | Task file |
|------:|----|--------|-----------|
| 1 | **4b-01** | **IDT team + questions** — add member, list, send question, remind | [task-4b-01-idt-questions-done.md](./task-4b-01-idt-questions-done.md) |
| 2 | **4b-02** | **Section workspaces** — intervention review, new intervention sync, autosave, optional AI | [task-4b-02-section-workspaces-done.md](./task-4b-02-section-workspaces-done.md) |
| 3 | **4b-03** | **Resident context tab** — interventions, pattern, assessments | [task-4b-03-resident-context-done.md](./task-4b-03-resident-context-done.md) |
| 4 | **4b-04** | **Push + in-app signals** — ready to lock, section done, post-close nurse | [task-4b-04-notifications-phase2-done.md](./task-4b-04-notifications-phase2-done.md) |
| 5 | **4b-05** | **WAiK intelligence completion** — charts, API naming alignment, link parsing | [task-4b-05-waik-intelligence-done.md](./task-4b-05-waik-intelligence-done.md) |
| 6 | **4b-06** | **QA, tests, doc close-out** | [task-4b-06-qa-and-docs-done.md](./task-4b-06-qa-and-docs-done.md) |

Dependencies: **4b-01** can overlap slightly with 4b-04 (push from questions). **4b-02** and **4b-03** both touch resident APIs — do **4b-02** intervention review after confirming resident intervention routes. **4b-06** is last.

---

## Global constraints (every task)

1. **Facility scoping**: every API and fetch must use the same pattern as other admin pages (`getAdminContextQueryString`, `credentials: "include"`). Never mix incidents across facilities.
2. **Phase 2 access**: `canAccessPhase2` (and super-admin) for investigator workflows; do not expose Phase 2 lock/sign-off to staff-tier roles in UI (server must still 403 on misuse).
3. **Auditability**: lock/unlock/sign actions already write `auditTrail`; new actions (e.g. IDT add) should either append `auditTrail` or be clearly product-approved if omitted.
4. **Run before merge**: `npm run typecheck`, `npm test`, `npm run build`.

---

## When phase 4b is “done”

- [ ] Task 09 success criteria in `task-09-phase2-intelligence.md` are met or explicitly superseded (see [task-4b-06-qa-and-docs-done.md](./task-4b-06-qa-and-docs-done.md) “Remaining vs spec” if not).
- [x] **Redis + OpenAI**: `OPENAI_API_KEY`, `OPENAI_LLM_MODEL` / `lib/openai` `AI_CONFIG`, `REDIS_URL` (see 4b-06 appendix).
- [ ] Staging: fill the QA matrix in `task-4b-06-qa-and-docs-done.md` after a full product pass.

---

## Related documentation

- [../phase_4/task-09-phase2-intelligence.md](../phase_4/task-09-phase2-intelligence.md) — full original spec
- [../phase_3e_2/phase_3e_2_task_handoff.md](../phase_3e_2/phase_3e_2_task_handoff.md) — admin context query patterns

---

## Super admin: how to test and demo in the UI

Use this for **pilot demos** and **regression checks** of Phase 2 + community intelligence. It assumes a **WAiK super admin** user (Mongo `User` with `isWaikSuperAdmin: true` and matching Clerk `publicMetadata.isWaikSuperAdmin` if your project syncs that field).

### 1) One-time setup

- **Run the app** locally: `npm run dev` (or your staging URL).
- **Sign in** as the super admin Clerk account that maps to a Mongo user with `isWaikSuperAdmin: true`.
- **Choose a facility**: in the admin shell, use the **facility switcher** (or add `?facilityId=<facility-id>&organizationId=<org-id>` to the URL). Many admin APIs **require** `facilityId` in the query for super admins; if something 400s with “facilityId required,” you are on a page without that context—open **Dashboard** or **Incidents** from the admin nav so the app sets context, or append the query params manually.
- **Data**: use `scripts/seed-dev.ts` (or your project’s seed command) so you have at least:
  - one incident in **`phase_1_in_progress`** (optional: old admin editor),
  - one in **`phase_1_complete`** (unclaimed—shows **Claim** overlay),
  - one in **`phase_2_in_progress`** with `phase2Sections` partially filled (if seed supports it),
  - one in **`closed`** (optional: locked investigation),
  - residents with `residentId` linked to incidents for resident context.

If no seed row fits, create a test incident through the normal **staff** flow, complete Phase 1 in product until `phase_1_complete`, then continue as super admin (claim is still allowed if your super admin is treated as Phase-2–capable in the UI).

### 2) Demo path A — Admin dashboard and pipeline

1. Open **`/admin/dashboard`** (with facility context in the URL if needed).
2. Call out: **open vs closed** counts, **needs attention** / **active investigations** (cards that link to incidents in Phase 1 complete or Phase 2).
3. Click through to an incident that is **awaiting claim** or **in Phase 2**—this lands on Phase 2 shell (see path B).

### 3) Demo path B — Phase 2 investigation (core “we built this” story)

1. Open **`/admin/incidents`** (list). Pick an incident in **`phase_1_complete`** (not yet claimed) **or** already in Phase 2.
2. Deep link pattern: **`/admin/incidents/<incident-id>?facilityId=...&organizationId=...`**
3. **Unclaimed** (`phase_1_complete`, no investigator): you should see the **full-screen “Claim this investigation”** flow. **Claim** → phase becomes `phase_2_in_progress` and the **four tabs** appear: Phase 1 record, IDT &amp; questions, Investigation sections, Resident context.
4. **Phase 1 record tab**: toggle **Both** / **original only**; show **verbatim** vs **enhanced** narrative; scroll **Q&amp;A** list.
5. **Investigation sections tab**: four **status dots**; **“Work in section”** → opens  
   **`/admin/incidents/<id>/section/contributing-factors`** (and the other kebab segments: `root-cause`, `intervention-review`, `new-intervention`). Complete **Contributing factors** and **Root cause** (root cause must be **≥ 50 characters** to mark complete).
6. **When all four sections are complete**: **“Go to sign-off”** on the shell → **`/admin/incidents/<id>/signoff`**
7. **Sign-off page**: as super admin, you can often **sign as both** DON and **Administrator** in a single session (the app checks **role** from your WAiK role slug; if your test user is not `director_of_nursing` / `administrator` / `owner`, use **two browser profiles** or two accounts for a realistic demo: DON signs first, then admin). **Lock** only enables when **both** signatures exist and the server rule for **all sections complete** is satisfied (super admin may have bypass in API—still show the real flow in the UI first).
8. **Closed** incident: from the same shell, show **Unlock** (reason **≥ 20** characters) → back to `phase_2_in_progress` and **signatures cleared**.

### 4) Demo path C — Community WAiK Intelligence

1. Open **`/admin/intelligence`** with the same **`facilityId` / `organizationId`** in the query string as the rest of admin (use the switcher; do not hand-type wrong facility).
2. **Ask** a natural-language question; use one of the **eight suggested queries** to show quick value.
3. **Four insight cards** (This week, Completeness, Attention, Staff) + **Daily brief** when the API returns text.
4. **OpenAI / Redis**: if **`OPENAI_API_KEY`** is unset, you may get **degraded** text or cache misses; for a clean demo, set the key in `.env.local` and ensure **Redis** (`REDIS_URL`) is up for **1-hour** insight/brief cache behavior (second load within the hour should match cache).

### 5) What to say in a 3-minute script (talk track)

- “Nursing finishes Phase 1; the administrator **claims** Phase 2 for this room.”
- “Everything here is **facility-scoped**—we use the org/facility in the URL so we never mix communities.”
- “We walk the **four investigation sections**, then **dual sign-off** (DON + administrator) before **lock**—that’s the regulatory close.”
- “**WAiK Intelligence** answers questions against **this community’s** incidents only; cards and brief are **cached** for performance.”

### 6) Common demo blockers and fixes

| Symptom | What to check |
|--------|----------------|
| 400 `facilityId required for super admin` | Add `?facilityId=...` (and `organizationId` if your org model requires it); use the facility **switcher** on a page that sets context. |
| No incidents in the list | Wrong facility; re-seed; or create data in that facility. |
| Cannot sign as DON / admin | Your Clerk/Mongo user’s `roleSlug` is not the right role; use a seeded DON/admin user or a second profile. |
| Lock button disabled | Both signatures not saved, or not all **four** sections `complete` (see API rules). |
| Intelligence empty or generic | No incidents in that facility, or no OpenAI key. |
| Push / notifications not firing | VAPID / device permission; some flows are **server best-effort**—check network tab to `POST /api/push/send` if 4b-04 is implemented. |

### 7) Optional: super admin–only screens

- **`/waik-admin`** (and org/facility management): useful to show **which facility** you are about to open in the admin app after seeding. Not required for Phase 2 incident demo.

---

*Add screenshots or a Loom under your team’s internal wiki; keep this file as the single source of route names and order.*

