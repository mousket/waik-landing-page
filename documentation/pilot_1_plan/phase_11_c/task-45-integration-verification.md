## Status: OPEN
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 2–3 hours
## Depends On: tasks 40–44

---

## Why This Task Exists

Phase 11c is primarily UX and parity. Regressions are visual and flow-based — easy to
miss without a written verification pass and a few automated guards.

---

## What This Task Creates / Modifies

### Tests (vitest)

Add or extend tests under `__tests__/`:

1. **Preview response shape** — mock preview route handler or test helper that builds
   `PreviewResponse` includes `facilityName`, `facilityLogoUrl`.
2. **Complete route** — POST without `signatureImage` returns 400 (if hardened in 44).
3. **Phase1ClinicalDocument** — smoke render with/without facility logo (jsdom).

Keep tests meaningful; no snapshot of entire document tree.

### Manual QA script (in this file's Success Criteria)

Document in commit or mark done in README.

### Modified: `documentation/pilot_1_plan/PILOT_READY.md`

Add Phase 11c checklist section:

- [ ] Clinical document preview after last closing question
- [ ] Facility logo in letterhead (when uploaded)
- [ ] WAiK logo in preview and PDF
- [ ] Draw and type signature both work on iPhone
- [ ] Single submit step (no redundant signoff card)
- [ ] PDF download matches preview letterhead
- [ ] Resume report opens preview, not blind submit

### Modified: `documentation/pilot_1_plan/phase_11_b/README.md`

Add pointer: "Presentation polish → [Phase 11c](../phase_11_c/README.md)".

---

## Implementation Prompt

```
Add vitest coverage for preview payload branding fields and complete-route
signature requirement. Run full manual QA script for Phase 11c flows on desktop
and mobile viewport. Update PILOT_READY.md with 11c checklist. Link phase 11c
from phase 11b README.
```

---

## Manual QA Script

1. **New report end-to-end** — fall incident, answer all tiers + closing → document preview → draw sign → submit → reportcard → open incident report page → download PDF.
2. **Typed signature** — repeat with "Type my name" mode.
3. **Section edit** — change "Immediate Interventions" in preview → verify in PDF.
4. **Facility logo** — upload logo in admin → new report preview shows co-branding.
5. **No logo** — remove logo → text-only facility name, no broken images.
6. **Preview retry** — simulate preview failure (disconnect network mid-load) → retry works.
7. **Resume** — defer mid-report, resume from dashboard, complete to preview path.
8. **Access** — non-reporter staff cannot open signed report page.

---

## Success Criteria

- [ ] All manual QA steps pass on Chrome + one mobile device (or DevTools mobile)
- [ ] New/updated vitest tests pass (`npm test`)
- [ ] `npm run typecheck && npm run build` pass
- [ ] PILOT_READY.md updated with 11c items
- [ ] Phase 11c README success criteria all checked
