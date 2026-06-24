## Status: OPEN
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 3–4 hours
## Depends On: task-40, task-42

---

## Why This Task Exists

The nurse signs the **HTML preview**, but compliance teams keep the **PDF**. If the PDF
letterhead differs from what she saw, trust breaks. Phase 11b PDF shows facility name
as text only and "WAiK — Confidential" in the footer — not co-branded letterhead.

---

## What This Task Creates / Modifies

### Modified: `components/staff/phase1-pdf-template.tsx`

**Header row (match HTML letterhead):**

- Left: facility logo `<Image>` when `facilityLogoUrl` set, else facility name text large
- Right: WAiK logo image (bundle or absolute URL)
- Title: `INCIDENT REPORT — PHASE 1 CLINICAL RECORD`
- Teal divider (existing `TEAL` constant)

Pass new props:

```ts
export function Phase1PdfTemplate({
  incident,
  facilityName,
  facilityLogoUrl,
  waikLogoUrl,
}: { ... })
```

**Footer:** keep confidentiality line; optional smaller WAiK wordmark.

### Modified: `lib/report/generate-phase1-pdf.ts`

Load facility `logoUrl` when generating PDF; pass to template.

### Modified: `app/staff/incidents/[id]/report/page.tsx`

If not fully migrated in task 40, ensure letterhead uses same branding props as preview
(facility logo + WAiK from facility record).

### Image requirements for `@react-pdf/renderer`

- URLs must be absolute HTTPS in production.
- For local dev, test with `NEXT_PUBLIC_APP_URL` base.
- If CORS/host blocks remote images, embed facility logo as base64 at PDF generation time (helper in generate-phase1-pdf).

---

## Implementation Prompt

```
Update Phase1PdfTemplate and generate-phase1-pdf to accept facilityLogoUrl and
waikLogoUrl. Render co-branded letterhead matching Phase1ClinicalDocument HTML.

Ensure staff post-submit report page uses the same branding data from facility record.
Test PDF download on a signed incident with and without facility logo.
```

---

## Test Cases

1. Signed incident with facility logo → PDF header shows both logos.
2. Signed incident without logo → PDF shows facility name text + WAiK logo.
3. PDF section order matches preview: narrative → clinical sections → Q&A → signature image.
4. Signature image appears in PDF when present on incident.
5. Re-download PDF (cached URL) still shows correct branding.

---

## Success Criteria

- [ ] PDF letterhead matches HTML letterhead content
- [ ] `generate-phase1-pdf` loads facility branding
- [ ] Staff report page shows same logos as preview
- [ ] No regression when `logoUrl` is null
- [ ] `npm run build` passes (react-pdf image URLs valid at build time)
