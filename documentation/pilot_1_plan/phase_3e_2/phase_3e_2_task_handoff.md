# Phase 3e.2 — Task handoff (for the next agent)

**Purpose:** Pick up all **tightening** work deferred after Phase **3d** and **3e** — token migration, visual outliers, lint signal, and a written **UI contract** so new changes stay on-brand.

**Read first:** `documentation/pilot_1_plan/phase_3e_2/README.md` (workstream table **09a–09h**).

---

## Context (what is already true)

- **Phase 3d** (`documentation/pilot_1_plan/phase_3d/`) — Tasks **07a–07h** are complete; `task-*-done.md` files are the source of truth.
- **Phase 3e** (`documentation/pilot_1_plan/phase_3e/`) — Admin facility context, API scope, and **08a–08h** are complete.
- This phase (**3e.2**) is **not** a redesign. It is **debt paydown and consistency** on top of shipped UI.

---

## What to accomplish (summary)

1. **Document** a minimal “UI definition of done” (checklist) — task **09a**.
2. **Align straggler pages/components** with `app/globals.css` tokens and shared primitives where `lib/design-tokens` / raw hex still dominate — **09b–09d**, **09e**.
3. **Polish** remaining rough edges (touch targets, beta incident flow borders) — **09f**, **09e**.
4. **Make lint/CI useful** for the directories you own — **09g** (see caveats below).
5. **Sign off** with a short manual run + update README status — **09h**.

---

## Concrete file and topic map

Use this as a **grep / ownership** map. Do not treat it as mandatory order inside a workstream.

### 09a — Checklist (documentation only)

- Target: new subsection under **`documentation/waik/08-COMPONENTS.md`** (Phase 3d / consistency), **or** `documentation/waik/UI-CONSISTENCY.md` if you want a one-pager.
- Suggested bullets: `PageHeader` + background wash for major surfaces; `WaikCard` (or shadcn `Card` only where already standard); `Button` + focus ring; **no new** `brand` imports in **new** `app/**` code; **48px** minimum for primary row actions on touch; **prefer** `border-border`, `text-muted-foreground`, `bg-primary`, etc.

### 09b — Offline

- **`app/offline/page.tsx`** — Today: dark gradient + hardcoded CTA hex. **Option A:** Match auth/landing wash + `Card` + primary `Button`. **Option B:** Keep dark for “disconnected” metaphor but use tokens + one paragraph in 09a doc marking the **only** allowed exception.
- **`components/offline-queue-list.tsx`** — Still uses `brand` for muted text; migrate in same PR as 09b if practical.

### 09c — Staff dashboard

- **`app/staff/dashboard/page.tsx`** — Inline hex for score / sparkline direction (`#0D7377`, `#16A34A`, etc.) and `style={{ color: brand.* }}` blocks.
- **`components/staff/staff-dashboard-performance.tsx`** — Same pattern: replace with `text-primary`, `text-amber-600`, `text-muted-foreground`, `border-border/…`, and chart-friendly semantic classes. Preserve **behavior and data**; this is className / style only.

### 09d — Admin and shared (incremental)

High-signal `brand` / inline-style **files** to migrate when touched (non-exhaustive; grep is authoritative):

- `components/admin/breadcrumb.tsx`
- `components/admin/admin-bottom-nav.tsx`
- `components/admin/needs-attention-tab.tsx`
- `components/admin/active-investigations-tab.tsx`
- `components/admin/daily-brief.tsx`
- `components/admin/idt-send-reminder-button.tsx`
- `components/admin/admin-facility-switcher.tsx`
- **`components/admin/admin-dashboard-shell.tsx`** (partial — lines using `brand.darkTeal` etc.)
- `components/staff/staff-app-shell.tsx` (if any remaining inline brand — verify against tokens)

**Rule of thumb:** When you edit a file for Phase 3e work, **finish token migration in that file** to avoid thrash. Large SVG/chart code may need small refactors; keep `stroke`/`fill` as CSS variables or `currentColor` where possible.

### 09e — Beta incident create

- **`app/incidents/beta/create/page.tsx`** — After the capture phase, some sections still use **heavy `border-2` / strong green** callouts. Align border weight, radius, and background tints with the capture header: `border border-border/50`, `rounded-2xl`, `from-primary/10 to-accent/10` style panels.

### 09f — Touch targets

- **`app/incidents/layout.tsx`** — Mobile header menu button is `h-10 w-10` (40px). Phase 3d north star was **48px** for primary touch actions; bump to `h-12 w-12 min-h-12` if layout allows without overlap. Scan **`app/staff/*`**, **`app/admin/*`** for similar **primary** nav/icon buttons.

### 09g — ESLint / CI

- **`.eslintignore`** at repo root already excludes `.next/`, `out/`, `node_modules/`, `public/sw.js`, `server.js`, `scripts/`.
- Remaining `npm run lint` noise is largely **`lib/*`** (`no-explicit-any`, misnamed `useTls` in `lib/redis.ts`, etc.). **Options:** (1) fix incrementally, (2) add targeted overrides in `.eslintrc.js` for `lib/`, (3) scope CI: `eslint app components lib/utils --max-warnings 0` — only if the team agrees CI scope.
- **Typecheck:** If CI does not run `tsc --noEmit`, consider adding it; there have been known union issues in client queue paths (verify current state in `tsc`).

### 09h — Verification

- Run the **09a** checklist in a real browser: **sign-in** → **staff dashboard** → **one incident create flow** → **admin dashboard** on **one phone + one desktop**.
- **Do not** block on pixel-perfect; block on **broken hierarchy**, **illegible contrast**, and **inconsistent** primary actions.

---

## Agent contract (same spirit as Phase 3d)

1. **No new design system in random page files** — use primitives and tokens.
2. **Prefer** `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary`, `text-muted-foreground` over `brand.*` and raw hex in **new or migrated** code.
3. **Respect `prefers-reduced-motion`** for ambient motion (see `components/login-wave-animation.tsx`).
4. **Small, reviewable PRs** — e.g. 09a doc alone, then 09b, then 09c+performance, then admin files in batches.

---

## Grep / search helpers

```bash
# Legacy brand usage in app + components
rg "design-tokens|from '@/lib/design-tokens'" app components

# Raw hex in app (spot-check; some may be legitimate, e.g. chart series)
rg "#[0-9A-Fa-f]{6}" app --glob "*.tsx"
```

---

## When Phase 3e.2 is “done”

- **09a** checked in and linked from `phase_3e_2/README.md` if you add a line there.
- **09h** task file created and renamed to `*-done.md` with a short manual QA log.
- **`documentation/pilot_1_plan/phase_3e_2/README.md`** top status: **Status: COMPLETE (date)**.

---

## If you get stuck

- **Design questions:** `documentation/waik/08-COMPONENTS.md` and Phase 3d `task-07a-design-audit-spec-done.md`.
- **Admin scope / APIs:** `documentation/pilot_1_plan/phase_3e/`, `lib/effective-admin-facility.ts`, `task-08f-*-docs*.md` — do **not** change facility rules as part of 3e.2 unless you are fixing a **bug** you discovered during UI work (then document).
