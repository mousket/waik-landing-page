## Status: OPEN
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 4–5 hours
## Depends On: Phase 11b task 34 complete

---

## Why This Task Exists

Today the clinical preview (`clinical-report-preview.tsx`) uses mobile card UI, while
the post-submit report page (`app/staff/incidents/[id]/report/page.tsx`) uses a more
formal print-oriented layout. The PDF template (`phase1-pdf-template.tsx`) is a third
variant. Nurses should see **one document language** everywhere.

This task extracts a shared **document shell** — letterhead, section headers, Q&A
tables, signature block placeholder — so tasks 41 and 43 can restyle without
duplicating markup.

---

## What This Task Creates / Modifies

### New: `components/staff/phase1-clinical-document.tsx`

A **presentational** component (no fetch, no signature canvas) with props:

```ts
export type Phase1ClinicalDocumentProps = {
  letterhead: {
    facilityName: string
    facilityLogoUrl?: string | null
    waikLogoUrl?: string  // default /waik-logo.png
    documentTitle?: string  // default "Incident Report — Phase 1 Clinical Record"
    incidentType: string
    incidentId: string
    incidentDate: string
    incidentTime?: string
    reportDate?: string
  }
  metadata: {
    residentName: string
    residentRoom?: string
    location: string
    reporterName: string
    reporterRole?: string
    completenessScore?: number
  }
  fullNarrative: string
  clinicalSections: Array<{ key: string; title: string; body: string }>
  qaGroups: Array<{
    title: string
    items: Array<{ question: string; answer: string; areaHint?: string }>
  }>
  signature?: {
    signedByName?: string
    signedAt?: string
    signatureImage?: string | null
    declaration?: string
  } | null
  /** When true, clinical sections show edit affordances (preview only) */
  editable?: boolean
  onEditSection?: (key: string) => void
  children?: React.ReactNode  // signature input slot for preview
}
```

**Visual spec (document mode):**

- Outer: white background, max-width ~800px, print-friendly (`print:bg-white`)
- **Letterhead row:** facility logo (left, max-h-12) + facility name; WAiK logo (right)
- Teal rule under letterhead (`border-b-2 border-primary`)
- Title block: document title, incident type badge, IDs/dates in muted mono
- **Metadata grid:** 2-column dl (resident, reporter, location, date/time)
- **Verbatim narrative:** left-border blockquote, label "Your original words"
- **Clinical sections:** numbered or titled blocks with `break-inside-avoid` for print
- **Q&A:** HTML `<table>` with header row (Question | Answer), not card list
- **Signature block:** declaration text, signer, datetime, optional image

Add CSS utility class group in component or `globals.css` if needed:

```css
/* e.g. .clinical-doc — serif/sans pairing, 11pt-equivalent text-sm, tight leading */
```

### Refactor (light): `app/staff/incidents/[id]/report/page.tsx`

Replace inline section markup with `<Phase1ClinicalDocument ... />` (read-only,
`editable={false}`, signature from incident).

Do **not** change route auth or data loading in this task — composition only.

---

## Implementation Prompt

```
Create components/staff/phase1-clinical-document.tsx as a presentational Phase 1
clinical record layout: letterhead (facility name + optional logo + WAiK logo),
metadata grid, verbatim narrative blockquote, clinical sections, Q&A tables,
signature block.

Refactor app/staff/incidents/[id]/report/page.tsx to use this component for
rendering (read-only). Match existing content — no behavior change.

Use print-friendly classes (break-inside-avoid on sections). No client-side
data fetching in the shell component.
```

---

## Test Cases

1. Open `/staff/incidents/[id]/report` for a completed incident — layout unchanged
   in substance, cleaner component structure.
2. Print preview (browser) — sections don't split awkwardly mid-paragraph.
3. Incident without signature image — signature block shows name/date only, no crash.
4. Long Q&A table — wraps across pages in print without losing header readability.

---

## Success Criteria

- [ ] `Phase1ClinicalDocument` exported and used by staff report page
- [ ] Letterhead supports optional `facilityLogoUrl` + `waikLogoUrl` props (image may be absent)
- [ ] Q&A rendered as tables, not cards
- [ ] No regression on staff report page access control
- [ ] `npm run typecheck` passes
