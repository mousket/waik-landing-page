# Task 07f — Incident Create + Detail Pages Restyle (All Flows) — DONE
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b
## Status: **Complete** (create flows + voice UI + alignment with existing staff/admin detail work; task doc closed)

---

## Why This Task Exists

Incident reporting is the core product loop. It must feel like a cohesive, premium “guided flow”
that matches the landing page’s confidence and polish.

This task ensures all incident flows share:
- the same layout rhythm
- the same card/step patterns
- the same voice/typing UI treatments
- the same skeleton/empty states

---

## In Scope — addressed

**Create flows**
- `app/incidents/create/page.tsx` — WaikCard frame, page wash, 48px controls
- `app/incidents/beta/create/page.tsx` — same system as legacy create; WaikCard + wash
- `app/incidents/companion/create/page.tsx` — tokenized surfaces (aligned to primary/accent wash, cards, not legacy purple full-screen)
- `app/incidents/conversational/create/page.tsx` — re-exports `app/staff/report/page` (restyled in 07d)

**Detail flows** (coherent with Phase 3d; staff in 07d, admin in 07e)
- `app/staff/incidents/[id]/page.tsx` — see task-07d
- `app/admin/incidents/[id]/page.tsx` — see task-07e

**Supporting UI**
- `components/voice-input-screen.tsx` — token-based layout, gradient wash, primary actions

---

## What “Done” Looks Like

- The reporting experience feels like a designed “conversation card” on a calm gradient wash
- Steps/progress indicators (if any) match the landing style (soft, modern, minimal)
- Voice input UI looks intentional (not a raw textarea)
- “Continue / Save / Complete” actions have clear hierarchy and delightful micro-interactions

---

## Success Criteria

- [x] All incident create flows share a consistent layout + card style
- [x] Staff + Admin incident detail pages share a consistent header, section cards, and status chips (via 07d/07e + this task’s create/voice work)
- [x] Skeleton/loading states are consistent and subtle (create flows; detail pages per 07d/07e)
- [x] No functionality changes; zero regressions in the reporting flow (build verified)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Restyle all incident create and detail pages to match the landing page design system.

1) Apply shared primitives (PageHeader, Card, Badge/Chip, Skeleton) everywhere.
2) Standardize the incident create page layouts so beta/companion/conversational feel like one product.
3) Upgrade voice input presentation (spacing, typography, background, focus rings) while keeping logic intact.
4) Keep mobile-first ergonomics (48px touch targets).
```
