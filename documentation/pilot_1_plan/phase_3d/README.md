# Phase 3d — Design Unification (Landing Page → Full App)
## Epic Overview

---

## Goal

Make **every WAiK surface** (auth, staff app, admin/back-office, incidents, assessments, dashboards) feel like it belongs to the **landing page**: vibrant but professional, soft glass + gradients, consistent typography, modern spacing, and intentional motion.

The landing page is the **standard**. Phase 3d brings the rest of the product up to that standard without re-architecting the app.

---

## Design North Star (what “matching the landing page” means)

**Visual language**
- **Typography**: Plus Jakarta Sans for headings; Inter for body (already configured in `app/layout.tsx` and `app/globals.css`).
- **Color**: teal primary + electric purple accent, neutral surfaces, soft borders (already in `app/globals.css` tokens).
- **Surface**: layered depth (cards on tinted backgrounds), subtle borders, controlled shadows, and large radius.
- **Motion**: micro-interactions (hover lift, subtle scale, shimmer/skeleton) + ambient background animation on auth.

**UX language**
- **Clarity first**: high-contrast text, calm hierarchy, never “busy”.
- **Mobile-first**: 48px touch targets remain non-negotiable.
- **Consistency**: the same components and spacing rules across staff/admin/incident flows.

---

## Scope

In-scope
- Unify styling across:
  - Auth / sign-in / sign-up / account pending
  - Staff app (dashboard, incidents, assessments, report)
  - Admin app (dashboard, incidents, assessments, residents, settings)
  - Incident create flows (beta + companion + conversational)
  - Incident detail pages (staff + admin)
- Create a **single UI recipe** for: cards, tables, page headers, filters, empty states, skeletons, banners, badges, and toasts.
- Reuse the **auth wave background animation** pattern where appropriate (login + “account pending” + redirect/loading contexts).

Out-of-scope (explicitly not part of Phase 3d)
- Changing business logic, data models, or API contracts (unless required for UI rendering).
- New features unrelated to UI cohesion.

---

## Architecture Map (where design lives)

```
Design Tokens (CSS variables)
    └── app/globals.css

Brand helpers (legacy staff/admin palette)
    └── lib/design-tokens.ts

Reusable components (shadcn + WAiK custom)
    ├── components/ui/*
    ├── components/* (landing sections, shared)
    ├── components/staff/*
    └── components/admin/*

App shells (layout + nav + background)
    ├── components/staff/staff-app-shell.tsx
    ├── components/admin/admin-app-shell.tsx
    └── components/ui/auth-background.tsx
```

---

## Key Design Decisions (read before any subtask)

**Single source of truth moves to CSS tokens.**
`app/globals.css` already defines `--primary`, `--accent`, `--radius`, and heading fonts. Phase 3d standardizes pages/components to use these tokens consistently instead of mixing in `lib/design-tokens.ts` ad-hoc values.

**Two-tier surfaces:**
- Page background: tinted gradient wash (very low opacity).
- Content surfaces: white (or near-white) cards with soft border + shadow.

**A “WAiK Page Header” pattern replaces one-off headers.**
Every major page gets the same structure: title, subtitle, primary action, secondary actions/filters, and optional right-side status chips.

**Auth uses the wave background animation everywhere appropriate.**
`components/ui/auth-background.tsx` is the approved background frame. All auth-adjacent pages should use it for instant brand consistency.

---

## Subtask Index

| Task  | What It Builds                                                     | Est. Time |
|-------|---------------------------------------------------------------------|-----------|
| 07a   | Landing-page design audit → app-wide design spec + component recipes | 2–3 hrs   |
| 07b   | Tokens + primitives alignment (cards/tables/forms/buttons/badges)    | 3–5 hrs   |
| 07c   | Auth makeover: wave background everywhere + polished auth screens    | 2–3 hrs   |
| 07d   | Staff surfaces restyle (dashboard/incidents/assessments/report)      | 4–6 hrs   |
| 07e   | Admin/back-office surfaces restyle (dashboard/incidents/settings)   | 4–6 hrs   |
| 07f   | Incident create + detail pages “landing-grade” UI (all flows)        | 4–6 hrs   |
| 07g   | Assessments UI polish (staff + admin) + delightful skeleton states   | 2–4 hrs   |
| 07h   | Integration verification (visual regression checklist + cleanup)     | 1–2 hrs   |

---

## Dependency Order

```
07a → 07b → 07c → 07d → 07e → 07f → 07g → 07h
```

07a defines the rules, 07b creates the shared building blocks, then we reskin surfaces with minimal churn.

