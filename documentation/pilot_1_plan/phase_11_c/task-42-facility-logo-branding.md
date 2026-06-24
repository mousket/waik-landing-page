## Status: DEFERRED — client/facility logo not in pilot v1 (WAiK logo only; see README)
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 4–5 hours
## Depends On: Phase 11b complete

---

## Why This Task Exists

The original Phase 11 spec called for **facility name and logo** in the preview
letterhead. Phase 11b shipped WAiK logo only. Facilities expect their own brand on
clinical documents shared with surveyors and families.

---

## What This Task Creates / Modifies

### Schema: `backend/src/models/facility.model.ts`

```ts
logoUrl?: string | null  // HTTPS URL to PNG/SVG/JPEG, max reasonable size
```

### Admin UI: facility branding settings

Location (pick one consistent with existing admin settings patterns):

- `app/admin/settings/facility/page.tsx` (new or extend existing facility settings), or
- Section on an existing admin settings hub

**UI:**
- Current facility name (read-only or editable per existing patterns)
- Logo upload: PNG/JPEG/SVG, max 2MB
- Preview thumbnail of current logo
- "Remove logo" clears `logoUrl`

### API: logo upload

**Option A (pilot-simple):** `POST /api/admin/facility/logo`

- Auth: admin tier, facility-scoped
- Accept multipart file → store in configured blob path OR `public/uploads/facilities/{facilityId}/logo.png`
- Update `FacilityModel.logoUrl` with absolute URL (`NEXT_PUBLIC_APP_URL` + path)

**Option B:** Reuse existing blob storage helper if `BLOB_STORAGE_URL` pattern exists from PDF task 35.

Document chosen approach in task commit message.

### API: `POST /api/report/preview`

Load facility by `session.facilityId`:

```ts
facilityName: facility.name
facilityLogoUrl: facility.logoUrl ?? null
waikLogoUrl: `${process.env.NEXT_PUBLIC_APP_URL}/waik-logo.png`
```

Include in JSON response and pass to `ClinicalReportPreview`.

---

## Implementation Prompt

```
Add optional logoUrl to Facility model. Build admin facility branding UI with
logo upload (PNG/JPEG/SVG, size limit). POST /api/admin/facility/logo stores
file and updates facility.logoUrl.

Extend POST /api/report/preview to return facilityName, facilityLogoUrl, waikLogoUrl.
Wire preview component letterhead to show facility logo when present.
```

---

## Test Cases

1. Admin uploads logo → preview letterhead shows facility image + WAiK logo.
2. Admin removes logo → preview shows facility name text only (no broken image).
3. Staff user cannot hit admin logo upload route (403).
4. Invalid file type rejected with clear error.
5. Preview API returns branding fields for active session.

---

## Success Criteria

- [ ] `logoUrl` on facility document, optional, non-breaking
- [ ] Admin can upload and remove facility logo
- [ ] Preview API returns `facilityName`, `facilityLogoUrl`, `waikLogoUrl`
- [ ] Letterhead renders facility logo when set
- [ ] `npm run typecheck` passes

---

## Security notes

- Validate MIME type and file size server-side.
- Serve uploaded logos from a stable URL; avoid executable content.
- Facility-scoped: admin can only update their own facility's logo.
