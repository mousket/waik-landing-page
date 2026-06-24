## Status: OPEN
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 3–4 hours
## Depends On: task-40, task-42 (for branding props; can stub logos until 42 lands)

---

## Why This Task Exists

`ClinicalReportPreview` was built as a mobile-first card screen. The desired experience
is a **DocuSign-style document** the nurse scrolls through before signing — same visual
language as the signed record she can open later.

---

## What This Task Creates / Modifies

### Modified: `components/staff/clinical-report-preview.tsx`

1. **Replace card layout** with `Phase1ClinicalDocument` from task 40.
2. Keep **local state** for section edits, signature mode, canvas — pass edited bodies
   into `clinicalSections` props.
3. Render signature canvas / typed name UI in the `children` slot or a dedicated
   `signatureSlot` below the document body (inside the white page, not a separate card).
4. Primary CTA at bottom (sticky): **"Submit signed report"** — disabled until signature
   valid (task 44 wires submit; this task can keep `onContinue` prop name temporarily).

**Remove or soften:**
- Gradient card wrappers (`rounded-2xl border-primary/20 bg-gradient-to-br...`) on
  document body sections
- Pill-style Q&A cards → tables via shared shell

**Keep:**
- Draw / Type signature toggle
- Section pencil edit → textarea
- Verbatim narrative non-editable
- Completion ring (optional: move to metadata grid corner)

### Modified: `app/api/report/preview/route.ts` (if task 42 not done yet)

Stub `facilityName` from session/facility query; `facilityLogoUrl: null` until task 42.

### Modified: `PreviewResponse` type

```ts
facilityName: string
facilityLogoUrl?: string | null
waikLogoUrl?: string
```

---

## Implementation Prompt

```
Restyle components/staff/clinical-report-preview.tsx to render through
Phase1ClinicalDocument (task 40). Preserve edit, draw/type signature, and
onContinue behavior. Document should look like a formal clinical record on
white background — not mobile gradient cards.

Extend PreviewResponse with facilityName and optional facilityLogoUrl.
```

---

## Test Cases

1. Complete all closing questions → preview shows document layout (tables, letterhead).
2. Edit a clinical section → saved text appears in document body before continue.
3. Draw signature → Submit/Continue enables; clear → disables.
4. Type signature → Caveat preview + base64 on continue.
5. iPhone SE viewport — document scrolls; sticky CTA visible; signature canvas usable.

---

## Success Criteria

- [ ] Preview uses `Phase1ClinicalDocument`
- [ ] Q&A displayed as tables in preview
- [ ] Signature UX unchanged in capability (draw + type)
- [ ] WAiK logo visible in letterhead
- [ ] `npm run typecheck` passes
