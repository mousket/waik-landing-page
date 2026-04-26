# Task 07h — Integration Verification (Visual Consistency + Regression Checklist)
## Phase: 3d — Design Unification
## Estimated Time: 1–2 hours
## Depends On: task-07c, task-07d, task-07e, task-07f, task-07g

---

## Why This Task Exists

Design work fails when it’s applied unevenly. This task forces a “single pass” over the app
to catch mismatched spacing, inconsistent buttons, and stray colors.

---

## Checklist (manual verification)

Auth
- [ ] `/sign-in` matches landing-grade styling and uses wave background
- [ ] `/sign-up` matches sign-in styling and uses wave background
- [ ] `/auth/account-pending` uses the same frame and card recipe
- [ ] Redirect/loading screens look branded, not like a blank utility page

Staff
- [ ] `/staff/dashboard` page header + cards consistent with other pages
- [ ] `/staff/incidents` list rows + filters consistent
- [ ] `/staff/incidents/[id]` detail header + section cards consistent
- [ ] `/staff/report` feels like a guided flow, not a raw form
- [ ] `/staff/assessments` cards/status chips consistent

Admin / Back office
- [ ] `/admin/dashboard` tabs/cards/tables consistent with the system
- [ ] `/admin/incidents` list + filters consistent
- [ ] `/admin/incidents/[id]` detail pages consistent with staff detail patterns
- [ ] `/admin/assessments` consistent with staff assessments
- [ ] `/admin/settings/*` consistent headers/forms

General UI system checks
- [ ] Primary buttons look identical everywhere
- [ ] Focus rings are consistent and accessible
- [ ] No harsh borders; borders use tokenized `--border` softness
- [ ] Shadows are consistent (no random drop shadows)
- [ ] Radius is consistent (matches `--radius`)
- [ ] Skeleton shimmer is consistent
- [ ] Reduced motion: animations don’t harm usability

---

## Success Criteria

- [ ] App feels like one cohesive product matching the landing page
- [ ] No layout regressions (mobile + desktop)
- [ ] No style regressions in critical flows (incident reporting, admin triage)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Run a visual consistency pass across WAiK after Phase 3d restyles.

1) Navigate through auth, staff, and admin flows.
2) Fix any inconsistencies in:
   - PageHeader spacing
   - Card radius/shadow/border
   - Button variants
   - Table styling
   - Chips/badges
   - Skeleton/empty states
3) Ensure reduced-motion users are respected.
```

