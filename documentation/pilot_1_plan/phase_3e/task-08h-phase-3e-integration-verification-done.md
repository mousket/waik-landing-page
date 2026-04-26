# Task 08h — Phase 3e integration verification & sign-off

**Phase:** 3e  
**Status:** DONE (2026-04-25)

## Scope (original)

See **`task-08-EPIC-admin-facility-data-alignment-done.md` § 08h**.

## Automated / repo verification

- **`npm run build`** (2026-04-25): **passed** (exit 0) — Next.js 14 production build, all routes including `/admin/*` and `app/api` compile.

## Grep: `user.facilityId` / `currentUser.facilityId` in `app/api`

These **should not** be switched to URL-based admin scope — they are **staff**, **incident scoping to document**, **agent**, or **listing helper**:

| File | Rationale |
|------|-----------|
| `app/api/staff/incidents/route.ts` | Staff PWA — session facility |
| `app/api/staff/badge-counts/route.ts` | Staff PWA — session facility |
| `app/api/staff/notifications/route.ts` | Staff — session facility |
| `app/api/assessments/due/route.ts` | Staff “my due” list — `conductedById` + session `facilityId` (see epic exception) |
| `app/api/push/send/route.ts` | Push payload; staff session context |
| `app/api/facilities/route.ts` | `currentUser.facilityId` for **fallback** row when org list incomplete — not an admin list API |
| `app/api/incidents/[id]/route.ts`, `.../questions/.../route.ts`, `.../phase/route.ts` | Use **`scope.incident.facilityId` first**; `user.facilityId` is fallback after incident access check — not admin list |
| `app/api/agent/*` | Expert investigator — session facility |

**Admin routes** under `app/api/admin/*` and **`GET/POST` `/api/residents`**, **`GET` `/api/incidents`** (list) use **`resolveEffectiveAdminFacility`** (verified by import grep). **`GET /api/admin/roles`** is global (no per-facility data).

## Security note (manual QA)

- Sign in **only in your own browser** (or incognito). **Do not** put production passwords in chat, tickets, or AI tools. If a password was shared, **rotate it in Clerk** before continuing.
- Repo already ignores `/.env*` except `.env.example` (see root `.gitignore`).

## Manual QA (recommended before production roll-out)

Run as **WAiK super admin** and as **org admin** with credentials that have access:

1. **Super admin** — open org with **0** facilities: empty state; “Open Admin Dashboard” disabled if applicable.  
2. **Super admin** — org with **1** facility: `facilityId` + `organizationId` in URL; dashboard, residents, staff, incidents list, assessments list match that facility.  
3. **Super admin** — org with **N** facilities: switcher changes URL and **lists + stats** change.  
4. **Org admin** — same-org facility switch: data matches **selected** facility, not only Mongo default.  
5. **Deep link** — `/admin/incidents/[id] →` Back to dashboard **preserves** query params.

*(Automated E2E was not added in this pass; the above is the sign-off checklist for humans.)*

## QA execution log (2026-04-26, agent)

| Check | Result |
|--------|--------|
| `npm run build` | **PASS** (exit 0) |
| `resolveEffectiveAdminFacility` usage in `app/api` | **Present** on admin + facility-scoped list routes (import grep) |
| Unauthenticated `/admin/dashboard?...` (local dev) | **Redirect to `/sign-in`** with `redirect_url` **URL-encoded to the full** `/admin/dashboard?facilityId=...&organizationId=...` so **Clerk post-login return preserves admin context** (observed in browser URL). |
| Manual items **1–5** (super-admin, org admin, switcher, deep link while signed in) | **Not run** — requires your **Clerk** session and pilot org data. Use **Incognito** + your test accounts, or add E2E later. |

If the dev server shows a **Next.js “Cannot find module './4013.js'” (or similar chunk) overlay**, stop the server, run `rm -rf .next`, then `npm run dev` and retry.

## Known follow-ups (optional, not blocking 3e)

- **E2E tests** for admin facility switching (Playwright) — future hardening.  
- **`/api/incidents/[id]/phase` PATCH** still uses `currentUser.facilityId` in one guard — **admin incident detail** uses per-incident access; full parity with `resolveEffectiveAdminFacility` for super-admin on another org’s facility can be a follow-up if product requires PATCH from cross-org admin URL.

## When done (original)

Set **Status: DONE** (add date) and **rename** this file to `task-08h-phase-3e-integration-verification-done.md`.  
Update **`README.md`** to mark Phase 3e complete if all prior tasks are done.
