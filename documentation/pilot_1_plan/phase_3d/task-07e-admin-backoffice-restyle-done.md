# Task 07e — Admin/Back-Office UI Restyle (Command Center, Landing-Grade) — DONE
## Phase: 3d — Design Unification
## Estimated Time: 4–6 hours
## Depends On: task-07b
## Status: **Complete** (admin + waik super-admin in scope; task doc closed)

---

## Why This Task Exists

Admin is the “credibility surface”. If it looks utilitarian or inconsistent,
it undermines trust. We want “modern healthcare ops console” that still
feels like WAiK (landing page DNA).

---

## In Scope (admin/back-office) — addressed

- Admin shell: `components/admin/admin-app-shell.tsx` (glass header, token nav, facility switcher)
- Admin pages: dashboard, incidents list + detail, assessments, residents, intelligence, settings (including staff management)
- Waik super-admin: `app/waik-admin/*` (shell + org/facility CRUD, tables, forms aligned with the same system)

---

## What “Done” Looks Like

- Dashboard tabs/cards feel premium and consistent with landing page
- Tables are modern (soft header, row hover, zebra optional, sticky header optional)
- Filters and actions look like a designed system (not scattered buttons)
- Sidebar/quick-stats (if present) uses the same card recipes

---

## Success Criteria

- [x] Admin shell uses the same elevated/glass header treatment as staff (appropriately restrained)
- [x] Admin pages share one consistent PageHeader + Card layout pattern
- [x] Tables and CSV/export UI feel cohesive and polished
- [x] Empty states and skeletons look intentional and branded (where those surfaces exist in-scope)

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
