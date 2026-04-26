# Task 07f — Incident Create + Detail Pages Restyle (All Flows)
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b

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

## In Scope

Create flows:
- `app/incidents/create/page.tsx`
- `app/incidents/beta/create/page.tsx`
- `app/incidents/companion/create/page.tsx`
- `app/incidents/conversational/create/page.tsx`

Detail flows:
- `app/staff/incidents/[id]/page.tsx`
- `app/admin/incidents/[id]/page.tsx`

Supporting UI:
- `components/voice-input-screen.tsx`
- shared UI primitives created in task-07b

---

## What “Done” Looks Like

- The reporting experience feels like a designed “conversation card” on a calm gradient wash
- Steps/progress indicators (if any) match the landing style (soft, modern, minimal)
- Voice input UI looks intentional (not a raw textarea)
- “Continue / Save / Complete” actions have clear hierarchy and delightful micro-interactions

---

## Success Criteria

- [ ] All incident create flows share a consistent layout + card style
- [ ] Staff + Admin incident detail pages share a consistent header, section cards, and status chips
- [ ] Skeleton/loading states are consistent and subtle
- [ ] No functionality changes; zero regressions in the reporting flow

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

