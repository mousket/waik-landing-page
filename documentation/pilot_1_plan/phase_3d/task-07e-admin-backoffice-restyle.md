# Task 07e — Admin/Back-Office UI Restyle (Command Center, Landing-Grade)
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b

---

## Why This Task Exists

Admin is the “credibility surface”. If it looks utilitarian or inconsistent,
it undermines trust. We want “modern healthcare ops console” that still
feels like WAiK (landing page DNA).

---

## In Scope (admin/back-office)

- Admin shell: `components/admin/admin-app-shell.tsx`
- Admin pages:
  - `app/admin/dashboard/page.tsx`
  - `app/admin/incidents/page.tsx` + `app/admin/incidents/[id]/page.tsx`
  - `app/admin/assessments/page.tsx`
  - `app/admin/residents/page.tsx`
  - `app/admin/settings/*`
- Waik super-admin (`app/waik-admin/*`) should be aligned at least for:
  - global layout, cards, tables, headers (not feature work)

---

## What “Done” Looks Like

- Dashboard tabs/cards feel premium and consistent with landing page
- Tables are modern (soft header, row hover, zebra optional, sticky header optional)
- Filters and actions look like a designed system (not scattered buttons)
- Sidebar/quick-stats (if present) uses the same card recipes

---

## Success Criteria

- [ ] Admin shell uses the same elevated/glass header treatment as staff (appropriately restrained)
- [ ] Admin pages share one consistent PageHeader + Card layout pattern
- [ ] Tables and CSV/export UI feel cohesive and polished
- [ ] Empty states and skeletons look intentional and branded

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Restyle admin/back-office surfaces to match the landing page design system.

1) Refactor components/admin/admin-app-shell.tsx to align with shared primitives:
   - header styling (glass/blur, softer border), spacing, active nav states.
2) Apply PageHeader + Card + Table primitives across admin dashboard/incidents/assessments/residents/settings.
3) Standardize action bars (filters, export buttons, facility picker) so they look designed.
4) Keep behavior unchanged; styling only.
```

